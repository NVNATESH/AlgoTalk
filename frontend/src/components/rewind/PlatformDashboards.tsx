'use client';

import { motion } from 'framer-motion';
import { Activity, ChevronUp, Flame, Globe } from 'lucide-react';
import type { PlatformDashboardEntry } from '@/types/platformDashboard';
import { cn } from '@/lib/utils';

const PLATFORM_LABEL: Record<string, { name: string; emoji: string; color: string }> = {
  leetcode: { name: 'LeetCode', emoji: '🟧', color: 'from-amber-500/30 to-amber-500/5 text-amber-300 border-amber-500/30' },
  codeforces: { name: 'Codeforces', emoji: '🔴', color: 'from-accent-rose/30 to-accent-rose/5 text-accent-rose border-accent-rose/30' },
  codechef: { name: 'CodeChef', emoji: '🟫', color: 'from-amber-700/30 to-amber-700/5 text-amber-200 border-amber-700/30' },
  hackerrank: { name: 'HackerRank', emoji: '🟢', color: 'from-accent-emerald/30 to-accent-emerald/5 text-accent-emerald border-accent-emerald/30' },
  atcoder: { name: 'AtCoder', emoji: '⚫', color: 'from-zinc-500/30 to-zinc-500/5 text-zinc-300 border-zinc-500/30' },
  gfg: { name: 'GeeksforGeeks', emoji: '🟩', color: 'from-emerald-700/30 to-emerald-700/5 text-emerald-300 border-emerald-700/30' },
  hackerearth: { name: 'HackerEarth', emoji: '🔵', color: 'from-accent-cyan/30 to-accent-cyan/5 text-accent-cyan border-accent-cyan/30' },
};

function relTime(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.round(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function PlatformDashboards({ platforms }: { platforms: PlatformDashboardEntry[] }) {
  if (platforms.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <Globe className="mx-auto h-8 w-8 text-zinc-600" />
        <h3 className="mt-3 font-display text-lg font-semibold">No connected platforms</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Connect a handle in{' '}
          <a href="/integrations" className="link-accent">
            Sync
          </a>{' '}
          to populate per-platform analytics here.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {platforms.map((p, i) => (
        <PlatformCard key={p.platform} entry={p} index={i} />
      ))}
    </div>
  );
}

function PlatformCard({ entry, index }: { entry: PlatformDashboardEntry; index: number }) {
  const meta = PLATFORM_LABEL[entry.platform] ?? {
    name: entry.platform,
    emoji: '⚪',
    color: 'from-white/10 to-transparent text-zinc-300 border-white/10',
  };
  const total = entry.difficulty.easy + entry.difficulty.medium + entry.difficulty.hard;
  const ratingTrend = (() => {
    if (entry.recentRatings.length < 2) return 0;
    const first = entry.recentRatings[entry.recentRatings.length - 1].rating;
    const last = entry.recentRatings[0].rating;
    return last - first;
  })();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.25) }}
      className={cn('glass overflow-hidden border-l-2 p-5', meta.color.split(' ').pop())}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl',
              meta.color
            )}
          >
            {meta.emoji}
          </div>
          <div>
            <div className="font-display text-base font-semibold">{meta.name}</div>
            <div className="text-[11px] text-zinc-500">@{entry.handle}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold tabular-nums">
            {entry.distinctSolved.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">solved</div>
        </div>
      </header>

      {/* Difficulty distribution bar */}
      {total > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>Difficulty mix</span>
            <span className="font-mono tabular-nums">
              E {entry.difficulty.easy} · M {entry.difficulty.medium} · H {entry.difficulty.hard}
            </span>
          </div>
          <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="bg-accent-emerald"
              style={{ width: `${(entry.difficulty.easy / total) * 100}%` }}
              title={`Easy ${entry.difficulty.easy}`}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${(entry.difficulty.medium / total) * 100}%` }}
              title={`Medium ${entry.difficulty.medium}`}
            />
            <div
              className="bg-accent-rose"
              style={{ width: `${(entry.difficulty.hard / total) * 100}%` }}
              title={`Hard ${entry.difficulty.hard}`}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat
          icon={Flame}
          label="Streak"
          value={entry.currentStreakDays > 0 ? `${entry.currentStreakDays}d` : '—'}
          tint="amber"
        />
        <Stat
          icon={Activity}
          label="Submissions"
          value={entry.submissions.toLocaleString()}
          tint="violet"
        />
        <Stat
          icon={ChevronUp}
          label={entry.platform === 'codeforces' ? 'Rating Δ' : 'Last solved'}
          value={
            entry.platform === 'codeforces'
              ? ratingTrend === 0
                ? '—'
                : `${ratingTrend > 0 ? '+' : ''}${ratingTrend}`
              : entry.lastSolvedAt
                ? relTime(entry.lastSolvedAt)
                : '—'
          }
          tint="emerald"
        />
      </div>

      {entry.topTopics.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Most practiced</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.topTopics.map((t) => (
              <span
                key={t.topic}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400"
                title={`${t.count} accepted`}
              >
                {t.topic} <span className="text-zinc-600">·{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-zinc-500">
        <span>
          {entry.isActive ? '🟢 Active' : '⏸ Paused'} · synced {relTime(entry.lastSyncAt)}
        </span>
        {entry.lastSolvedAt && (
          <span className="font-mono tabular-nums">last AC {relTime(entry.lastSolvedAt)}</span>
        )}
      </footer>
    </motion.section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tint: 'amber' | 'violet' | 'emerald';
}) {
  const map = {
    amber: 'text-amber-300',
    violet: 'text-accent-violet',
    emerald: 'text-accent-emerald',
  } as const;
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] py-2">
      <div className={cn('flex items-center justify-center gap-1', map[tint])}>
        <Icon className="h-3 w-3" />
        <span className="font-display text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}
