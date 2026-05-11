import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Notification } from '@/types/notification';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  pollIntervalId: number | null;

  refresh: () => Promise<void>;
  pollUnread: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;

  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;

  /** Ingest a notification pushed in via the realtime WS. Idempotent on id. */
  ingestPush: (n: Notification) => void;
}

// WS push is the primary delivery channel. The poll is a safety net for
// reconnect windows / dropped pushes — 60s keeps the browser quiet without
// noticeably delaying the unread badge if the socket is healthy.
const POLL_MS = 60_000;

export const useNotifications = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  pollIntervalId: null,

  async refresh() {
    set({ loading: true, error: null });
    try {
      const r = await api<{ notifications: Notification[]; unreadCount: number }>(
        '/notifications?limit=30',
        { auth: true }
      );
      set({
        notifications: r.notifications,
        unreadCount: r.unreadCount,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
    }
  },

  async pollUnread() {
    try {
      const r = await api<{ unreadCount: number }>('/notifications/unread-count', {
        auth: true,
      });
      // If unread changed, refetch the full list so the dropdown is in sync next open
      const prev = get().unreadCount;
      if (r.unreadCount !== prev) {
        set({ unreadCount: r.unreadCount });
        await get().refresh();
      }
    } catch {
      // ignore — keep last known state
    }
  },

  startPolling() {
    if (typeof window === 'undefined') return;
    if (get().pollIntervalId !== null) return;
    // Initial load
    void get().refresh();
    const id = window.setInterval(() => void get().pollUnread(), POLL_MS);
    set({ pollIntervalId: id });
  },

  stopPolling() {
    const id = get().pollIntervalId;
    if (id !== null && typeof window !== 'undefined') {
      window.clearInterval(id);
    }
    set({ pollIntervalId: null });
  },

  async markRead(ids) {
    if (ids.length === 0) return;
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        ids.includes(n.id) && !n.read
          ? { ...n, read: true, readAt: new Date().toISOString() }
          : n
      ),
      unreadCount: Math.max(
        0,
        state.unreadCount -
          state.notifications.filter((n) => ids.includes(n.id) && !n.read).length
      ),
    }));
    try {
      const r = await api<{ unreadCount: number }>('/notifications/mark-read', {
        method: 'POST',
        auth: true,
        body: { ids },
      });
      set({ unreadCount: r.unreadCount });
    } catch {
      // refresh on failure to recover real state
      await get().refresh();
    }
  },

  async markAllRead() {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.read ? n : { ...n, read: true, readAt: new Date().toISOString() }
      ),
      unreadCount: 0,
    }));
    try {
      await api('/notifications/mark-all-read', { method: 'POST', auth: true });
    } catch {
      await get().refresh();
    }
  },

  async remove(id) {
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: target && !target.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
    try {
      await api(`/notifications/${id}`, { method: 'DELETE', auth: true });
    } catch {
      await get().refresh();
    }
  },

  async clearAll() {
    set({ notifications: [], unreadCount: 0 });
    try {
      await api('/notifications/all', { method: 'DELETE', auth: true });
    } catch {
      await get().refresh();
    }
  },

  ingestPush(n) {
    set((state) => {
      // De-dupe — if we already have this id (e.g. from a recent poll), skip.
      if (state.notifications.some((x) => x.id === n.id)) return state;
      // Cap the in-memory list to ~30 to mirror the refresh limit.
      const trimmed = [n, ...state.notifications].slice(0, 30);
      return {
        notifications: trimmed,
        unreadCount: state.unreadCount + (n.read ? 0 : 1),
      };
    });
  },
}));
