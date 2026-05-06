'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  Eraser,
  Send,
  Sparkles,
  Square,
  User as UserIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Markdown } from './Markdown';
import { useMentor, selectThread } from '@/stores/mentorStore';
import { cn } from '@/lib/utils';

interface MentorChatProps {
  open: boolean;
  onClose: () => void;
  goalId: string;
  goalName: string;
  goalIcon: string;
  moduleId?: string;
  moduleTitle?: string;
}

export function MentorChat({
  open,
  onClose,
  goalId,
  goalName,
  goalIcon,
  moduleId = '',
  moduleTitle,
}: MentorChatProps) {
  const thread = useMentor(selectThread(goalId, moduleId));
  const loadThread = useMentor((s) => s.loadThread);
  const send = useMentor((s) => s.send);
  const stop = useMentor((s) => s.stop);
  const clear = useMentor((s) => s.clear);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    void loadThread(goalId, moduleId);
  }, [open, goalId, moduleId, loadThread]);

  useEffect(() => {
    if (!open) return;
    if (!thread.messages.length && !thread.streaming) return;
    queueMicrotask(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    );
  }, [open, thread.messages, thread.streaming]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !thread.streaming) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, thread.streaming, onClose]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || thread.streaming) return;
    setDraft('');
    try {
      await send(goalId, moduleId, text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed');
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear this conversation? This cannot be undone.')) return;
    try {
      await clear(goalId, moduleId);
      toast.success('Cleared');
    } catch (e) {
      toast.error('Clear failed');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !thread.streaming && onClose()}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:bg-black/20"
          />
          <motion.aside
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-white/10 bg-bg/95 backdrop-blur-2xl shadow-2xl md:w-[460px]"
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-medium text-accent-violet">
                  <Sparkles className="h-3 w-3" /> AI Mentor
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-zinc-100">
                  {goalIcon} {moduleTitle ?? goalName}
                </div>
                {moduleTitle && (
                  <div className="truncate text-xs text-zinc-500">in {goalName}</div>
                )}
              </div>
              <button
                onClick={handleClear}
                className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                title="Clear conversation"
                aria-label="Clear conversation"
                disabled={thread.streaming || thread.messages.length === 0}
              >
                <Eraser className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                disabled={thread.streaming}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
              {thread.loading && !thread.loaded ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-white/5" />
                  ))}
                </div>
              ) : thread.messages.length === 0 ? (
                <EmptyState moduleTitle={moduleTitle} onSuggest={(s) => setDraft(s)} />
              ) : (
                <ul className="space-y-4">
                  {thread.messages.map((m, i) => (
                    <MessageBubble
                      key={m.id}
                      role={m.role}
                      text={m.text}
                      streaming={
                        thread.streaming &&
                        i === thread.messages.length - 1 &&
                        m.role === 'model'
                      }
                    />
                  ))}
                </ul>
              )}
              {thread.error && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent-rose/30 bg-accent-rose/10 p-3 text-sm text-accent-rose">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{thread.error}</span>
                </div>
              )}
            </div>

            {/* Composer */}
            <footer className="border-t border-white/10 bg-bg/80 px-5 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={
                    moduleTitle
                      ? `Ask about ${moduleTitle}...`
                      : `Ask about ${goalName}...`
                  }
                  className="input-base min-h-[44px] max-h-40 resize-y py-2.5"
                  disabled={thread.streaming}
                />
                {thread.streaming ? (
                  <button
                    onClick={() => stop(goalId, moduleId)}
                    className="btn-ghost h-11 px-3"
                    title="Stop generating"
                    aria-label="Stop generating"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => void handleSend()}
                    disabled={!draft.trim()}
                    className="btn-primary h-11 px-4"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-1.5 text-center text-[10px] text-zinc-500">
                Press <kbd className="rounded bg-white/5 px-1 py-0.5">Enter</kbd> to send · <kbd className="rounded bg-white/5 px-1 py-0.5">Shift+Enter</kbd> for newline
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({
  role,
  text,
  streaming,
}: {
  role: 'user' | 'model';
  text: string;
  streaming: boolean;
}) {
  const isUser = role === 'user';
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
          isUser
            ? 'bg-white/10 text-zinc-300'
            : 'bg-gradient-to-br from-accent-violet to-accent-fuchsia text-white'
        )}
      >
        {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          'min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'rounded-tr-sm bg-accent-violet/15 text-zinc-100'
            : 'rounded-tl-sm bg-white/5 text-zinc-100'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        ) : text ? (
          <div className="text-sm">
            <Markdown>{text}</Markdown>
            {streaming && <TypingCursor />}
          </div>
        ) : (
          <ThreeDots />
        )}
      </div>
    </motion.li>
  );
}

function ThreeDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-violet"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
        />
      ))}
    </div>
  );
}

function TypingCursor() {
  return (
    <span className="ml-0.5 inline-block h-3 w-1.5 -translate-y-px animate-pulse bg-accent-violet align-middle" />
  );
}

function EmptyState({
  moduleTitle,
  onSuggest,
}: {
  moduleTitle?: string;
  onSuggest: (s: string) => void;
}) {
  const suggestions = moduleTitle
    ? [
        `Explain ${moduleTitle} in plain language`,
        `What's a common pitfall in ${moduleTitle}?`,
        `Give me a tricky practice problem on ${moduleTitle}`,
        `What should I review before this module?`,
      ]
    : [
        `What's the most important concept here?`,
        `Where should I start?`,
        `Suggest a study plan for the next week`,
      ];
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
        <Bot className="h-7 w-7 text-accent-violet" />
      </div>
      <h3 className="font-display text-lg font-semibold">Hi, I'm your mentor.</h3>
      <p className="mt-1 max-w-[280px] text-sm text-zinc-400">
        I know what you're learning. Ask me anything — I'll keep it short and useful.
      </p>
      <div className="mt-5 flex w-full flex-col gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-zinc-300 transition hover:border-accent-violet/40 hover:bg-white/5"
          >
            <Sparkles className="mr-1.5 inline h-3 w-3 text-accent-violet" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
