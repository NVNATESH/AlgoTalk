import { create } from 'zustand';
import { api } from '@/lib/api';
import { postNdjsonStream } from '@/lib/streamingApi';
import type { MentorConversation, MentorMessage, StreamEvent } from '@/types/mentor';

const threadKey = (goalId: string, moduleId: string) => `${goalId}::${moduleId}`;

interface ThreadState {
  goalId: string;
  moduleId: string;
  messages: MentorMessage[];
  loading: boolean;
  loaded: boolean;
  streaming: boolean;
  streamingAssistantId: string | null;
  error: string | null;
  abort: AbortController | null;
}

interface MentorState {
  threads: Record<string, ThreadState>;
  loadThread: (goalId: string, moduleId?: string) => Promise<void>;
  send: (goalId: string, moduleId: string, text: string) => Promise<void>;
  stop: (goalId: string, moduleId: string) => void;
  clear: (goalId: string, moduleId?: string) => Promise<void>;
}

const blankThread = (goalId: string, moduleId: string): ThreadState => ({
  goalId,
  moduleId,
  messages: [],
  loading: false,
  loaded: false,
  streaming: false,
  streamingAssistantId: null,
  error: null,
  abort: null,
});

export const useMentor = create<MentorState>((set, get) => ({
  threads: {},

  async loadThread(goalId, moduleId = '') {
    const key = threadKey(goalId, moduleId);
    const existing = get().threads[key];
    if (existing?.loaded || existing?.loading) return;

    set((state) => ({
      threads: {
        ...state.threads,
        [key]: { ...(existing ?? blankThread(goalId, moduleId)), loading: true },
      },
    }));

    try {
      const params = new URLSearchParams({ goalId, moduleId });
      const res = await api<{ conversation: MentorConversation }>(
        `/ai/mentor?${params.toString()}`,
        { auth: true }
      );
      set((state) => ({
        threads: {
          ...state.threads,
          [key]: {
            ...(state.threads[key] ?? blankThread(goalId, moduleId)),
            messages: res.conversation.messages,
            loaded: true,
            loading: false,
            error: null,
          },
        },
      }));
    } catch (err) {
      set((state) => ({
        threads: {
          ...state.threads,
          [key]: {
            ...(state.threads[key] ?? blankThread(goalId, moduleId)),
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load conversation',
          },
        },
      }));
    }
  },

  async send(goalId, moduleId, text) {
    const key = threadKey(goalId, moduleId);
    const existing = get().threads[key] ?? blankThread(goalId, moduleId);
    if (existing.streaming) return;

    const tempUserId = `tmp_u_${Date.now()}`;
    const tempAssistantId = `tmp_a_${Date.now()}`;
    const abort = new AbortController();

    set((state) => ({
      threads: {
        ...state.threads,
        [key]: {
          ...existing,
          messages: [
            ...existing.messages,
            {
              id: tempUserId,
              role: 'user',
              text,
              createdAt: new Date().toISOString(),
            },
            {
              id: tempAssistantId,
              role: 'model',
              text: '',
              createdAt: new Date().toISOString(),
            },
          ],
          streaming: true,
          streamingAssistantId: tempAssistantId,
          error: null,
          abort,
        },
      },
    }));

    let realAssistantId = tempAssistantId;
    let realUserId = tempUserId;

    try {
      await postNdjsonStream(
        '/ai/mentor',
        { goalId, moduleId, message: text },
        {
          signal: abort.signal,
          onLine: (line) => {
            let evt: StreamEvent;
            try {
              evt = JSON.parse(line);
            } catch {
              return;
            }
            if (evt.type === 'start') {
              realUserId = evt.userMessageId;
              realAssistantId = evt.assistantMessageId;
            } else if (evt.type === 'delta') {
              set((state) => {
                const t = state.threads[key];
                if (!t) return state;
                return {
                  threads: {
                    ...state.threads,
                    [key]: {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === tempAssistantId ? { ...m, text: m.text + evt.text } : m
                      ),
                    },
                  },
                };
              });
            } else if (evt.type === 'error') {
              set((state) => {
                const t = state.threads[key];
                if (!t) return state;
                return {
                  threads: {
                    ...state.threads,
                    [key]: { ...t, error: evt.message },
                  },
                };
              });
            }
          },
        }
      );
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      if (!aborted) {
        set((state) => {
          const t = state.threads[key];
          if (!t) return state;
          return {
            threads: {
              ...state.threads,
              [key]: {
                ...t,
                error: err instanceof Error ? err.message : 'Stream failed',
              },
            },
          };
        });
      }
    } finally {
      set((state) => {
        const t = state.threads[key];
        if (!t) return state;
        // promote temp ids to real ids; drop empty-assistant message if still empty
        const messages = t.messages
          .map((m) => {
            if (m.id === tempUserId) return { ...m, id: realUserId };
            if (m.id === tempAssistantId) return { ...m, id: realAssistantId };
            return m;
          })
          .filter((m) => !(m.id === realAssistantId && !m.text.trim()));
        return {
          threads: {
            ...state.threads,
            [key]: {
              ...t,
              messages,
              streaming: false,
              streamingAssistantId: null,
              abort: null,
            },
          },
        };
      });
    }
  },

  stop(goalId, moduleId) {
    const key = threadKey(goalId, moduleId);
    const t = get().threads[key];
    if (t?.abort) t.abort.abort();
  },

  async clear(goalId, moduleId = '') {
    const key = threadKey(goalId, moduleId);
    const params = new URLSearchParams({ goalId, moduleId });
    await api(`/ai/mentor?${params.toString()}`, { method: 'DELETE', auth: true });
    set((state) => ({
      threads: {
        ...state.threads,
        [key]: { ...(state.threads[key] ?? blankThread(goalId, moduleId)), messages: [], error: null },
      },
    }));
  },
}));

export const selectThread = (goalId: string, moduleId = '') => (state: MentorState) =>
  state.threads[threadKey(goalId, moduleId)] ?? blankThread(goalId, moduleId);
