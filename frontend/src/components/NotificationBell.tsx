'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications } from '@/stores/notificationStore';
import { useAuth } from '@/stores/authStore';
import type { Notification } from '@/types/notification';
import { cn } from '@/lib/utils';

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-accent-rose',
  high: 'bg-amber-300',
  medium: 'bg-accent-violet',
  low: 'bg-zinc-400',
};

export function NotificationBell() {
  const router = useRouter();
  const username = useAuth((s) => s.user?.username);
  const {
    notifications,
    unreadCount,
    loading,
    startPolling,
    stopPolling,
    markRead,
    markAllRead,
    remove,
    clearAll,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Boot polling on mount
  useEffect(() => {
    startPolling();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const grouped = groupByDay(notifications);

  const handleClick = async (n: Notification) => {
    if (!n.read) await markRead([n.id]);
    if (n.link) {
      // Resolve "/profile/me" → "/profile/{username}"
      const resolved = n.link === '/profile/me' && username ? `/profile/${username}` : n.link;
      setOpen(false);
      router.push(resolved);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative rounded-xl p-2 transition',
          open ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
        )}
        aria-label={`Notifications · ${unreadCount} unread`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia px-1 text-[9px] font-bold text-white shadow-md"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated/95 shadow-2xl backdrop-blur-xl"
          >
            <header className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
              <div>
                <h3 className="font-display text-sm font-semibold">Notifications</h3>
                <p className="text-[10px] text-zinc-500">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : notifications.length > 0
                      ? 'All caught up'
                      : 'Nothing here yet'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => void markAllRead()}
                    className="rounded-md p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
                    title="Mark all as read"
                    aria-label="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all notifications?')) void clearAll();
                    }}
                    className="rounded-md p-1.5 text-zinc-500 transition hover:bg-accent-rose/10 hover:text-accent-rose"
                    title="Clear all"
                    aria-label="Clear all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </header>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <SkeletonList />
              ) : notifications.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="divide-y divide-white/5">
                  {grouped.map((g) => (
                    <li key={g.label}>
                      <div className="bg-white/[0.02] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {g.label}
                      </div>
                      <ul className="divide-y divide-white/5">
                        {g.items.map((n) => (
                          <NotificationRow
                            key={n.id}
                            n={n}
                            onClick={() => void handleClick(n)}
                            onRemove={(e) => {
                              e.stopPropagation();
                              void remove(n.id);
                            }}
                          />
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationRow({
  n,
  onClick,
  onRemove,
}: {
  n: Notification;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          'group relative flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]',
          !n.read && 'bg-accent-violet/[0.06]'
        )}
      >
        {!n.read && (
          <span
            className={cn(
              'absolute left-1.5 top-3.5 h-1.5 w-1.5 rounded-full',
              PRIORITY_DOT[n.priority] ?? 'bg-accent-violet'
            )}
          />
        )}
        <div className="text-2xl leading-none">{n.icon || '🔔'}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                'line-clamp-2 text-sm',
                n.read ? 'text-zinc-400' : 'font-medium text-zinc-100'
              )}
            >
              {n.title}
            </span>
            <span className="shrink-0 text-[10px] text-zinc-500">{timeAgo(n.createdAt)}</span>
          </div>
          {n.message && (
            <p
              className={cn(
                'mt-0.5 line-clamp-2 text-xs',
                n.read ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              {n.message}
            </p>
          )}
        </div>
        <span
          role="button"
          aria-label="Remove notification"
          onClick={onRemove}
          className="invisible rounded p-1 text-zinc-500 transition group-hover:visible hover:bg-accent-rose/10 hover:text-accent-rose"
        >
          <X className="h-3.5 w-3.5" />
        </span>
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <BellOff className="h-8 w-8 text-zinc-600" />
      <h4 className="mt-3 font-display text-sm font-semibold">All quiet</h4>
      <p className="mt-1 max-w-[260px] text-xs text-zinc-500">
        Earn a badge, complete a goal, or post a challenge — alerts will land here.
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-px p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex animate-pulse items-start gap-3 p-3">
          <div className="h-6 w-6 rounded-full bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-white/5" />
            <div className="h-2.5 w-1/2 rounded bg-white/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function groupByDay(items: Notification[]) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sevenAgo = new Date(today);
  sevenAgo.setDate(today.getDate() - 7);

  const groups: Record<string, Notification[]> = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };
  for (const n of items) {
    const d = new Date(n.createdAt);
    if (d >= today) groups.Today.push(n);
    else if (d >= yesterday) groups.Yesterday.push(n);
    else if (d >= sevenAgo) groups['This week'].push(n);
    else groups.Earlier.push(n);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return 'now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
