'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type {
  Contest,
  ContestPlatform,
  ContestRegistrationItem,
} from '@/types/contest';
import { cn } from '@/lib/utils';

const PLATFORM_LABEL: Record<ContestPlatform, string> = {
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  leetcode: 'LeetCode',
  atcoder: 'AtCoder',
  hackerrank: 'HackerRank',
  hackerearth: 'HackerEarth',
  gfg: 'GFG',
};

const PLATFORM_TINT: Record<ContestPlatform, string> = {
  codeforces: 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan',
  codechef: 'border-amber-700/30 bg-amber-700/10 text-amber-300',
  leetcode: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  atcoder: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300',
  hackerrank: 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
  hackerearth: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  gfg: 'border-emerald-700/30 bg-emerald-700/10 text-emerald-300',
};

export default function ContestsPage() {
  const [upcoming, setUpcoming] = useState<Contest[] | null>(null);
  const [registrations, setRegistrations] = useState<ContestRegistrationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ContestPlatform>('all');

  const refresh = async () => {
    setError(null);
    try {
      const [up, mine] = await Promise.all([
        api<{ contests: Contest[] }>('/contests/upcoming?limit=50', { auth: true }),
        api<{ items: ContestRegistrationItem[] }>('/contests/mine', { auth: true }),
      ]);
      setUpcoming(up.contests);
      setRegistrations(mine.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const registeredIds = useMemo(
    () => new Set(registrations.map((r) => r.contest.id)),
    [registrations]
  );

  const filteredUpcoming = useMemo(() => {
    if (!upcoming) return [];
    if (filter === 'all') return upcoming;
    return upcoming.filter((c) => c.platform === filter);
  }, [upcoming, filter]);

  if (upcoming === null) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          {error ? (
            <div className="glass max-w-md p-6 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-accent-rose" />
              <p className="mt-3 text-sm">{error}</p>
              <button onClick={refresh} className="btn-primary mt-4">
                Retry
              </button>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
          )}
        </div>
      </AppShell>
    );
  }

  const past = registrations.filter(
    (r) => new Date(r.contest.endTime) < new Date()
  );

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent-violet" />
          <h1 className="font-display text-3xl font-bold">Contests</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Upcoming rounds across every platform · register to unlock a post-contest AI report.
        </p>
      </motion.div>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
        {(Object.keys(PLATFORM_LABEL) as ContestPlatform[]).map((p) => {
          const has = upcoming.some((c) => c.platform === p);
          if (!has) return null;
          return (
            <FilterChip
              key={p}
              label={PLATFORM_LABEL[p]}
              active={filter === p}
              onClick={() => setFilter(p)}
            />
          );
        })}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-base font-semibold">Upcoming</h2>
        {filteredUpcoming.length === 0 ? (
          <div className="glass p-8 text-center text-sm text-zinc-500">
            No upcoming contests on{' '}
            {filter === 'all' ? 'any platform' : PLATFORM_LABEL[filter as ContestPlatform]} yet.
            They sync every 30 min.
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredUpcoming.map((c) => (
              <UpcomingRow
                key={c.id}
                contest={c}
                registered={registeredIds.has(c.id)}
                onRegistered={refresh}
              />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-base font-semibold">Your past contests</h2>
          <ul className="space-y-2">
            {past.map((p) => (
              <PastRow key={p.contest.id} item={p} />
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-[11px] font-medium transition',
        active
          ? 'border-accent-violet/40 bg-accent-violet/15 text-accent-violet'
          : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100'
      )}
    >
      {label}
    </button>
  );
}

function UpcomingRow({
  contest,
  registered,
  onRegistered,
}: {
  contest: Contest;
  registered: boolean;
  onRegistered: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const start = new Date(contest.startTime);
  const startsInMs = start.getTime() - Date.now();
  const startsInLabel = startsInMs > 0 ? humanDelta(startsInMs) : 'starting now';

  const toggle = async () => {
    setBusy(true);
    try {
      if (registered) {
        await api(`/contests/${contest.id}/register`, { method: 'DELETE', auth: true });
        toast.success('Unregistered');
      } else {
        await api(`/contests/${contest.id}/register`, { method: 'POST', auth: true });
        toast.success(`Registered for ${contest.name}`);
      }
      onRegistered();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="glass flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            PLATFORM_TINT[contest.platform]
          )}
        >
          {PLATFORM_LABEL[contest.platform]}
        </span>
        <div className="min-w-0 flex-1">
          <a
            href={contest.url || '#'}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm font-medium text-zinc-100 hover:text-accent-violet"
          >
            {contest.name}
            <ExternalLink className="ml-1 inline h-3 w-3" />
          </a>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
            <Calendar className="h-3 w-3" />
            <span>{start.toLocaleString()}</span>
            <span>·</span>
            <span>{contest.durationMinutes} min</span>
            <span>·</span>
            <span className="text-accent-cyan">starts in {startsInLabel}</span>
          </div>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={cn(
          'shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition disabled:opacity-50',
          registered
            ? 'border border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20'
            : 'bg-accent-violet text-white hover:bg-accent-violet/90'
        )}
      >
        {busy ? '…' : registered ? '✓ Registered' : 'Register'}
      </button>
    </li>
  );
}

function PastRow({ item }: { item: ContestRegistrationItem }) {
  const reg = item.registration;
  const c = item.contest;
  return (
    <li className="glass flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            PLATFORM_TINT[c.platform]
          )}
        >
          {PLATFORM_LABEL[c.platform]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{c.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
            <span>{new Date(c.endTime).toLocaleDateString()}</span>
            {reg.rank !== null && <><span>·</span><span>rank {reg.rank}</span></>}
            {reg.score > 0 && <><span>·</span><span>{reg.score} pts</span></>}
            <span>·</span>
            <StatusPill status={reg.status} />
          </div>
        </div>
      </div>
      <Link
        href={`/contests/${c.id}/report`}
        className="inline-flex items-center gap-1 rounded-xl bg-accent-violet/15 px-3 py-1.5 text-xs font-medium text-accent-violet transition hover:bg-accent-violet/25"
      >
        {reg.reportId ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {reg.reportId ? 'View report' : 'Generate report'}
      </Link>
    </li>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    registered: 'text-zinc-400',
    live: 'text-accent-rose animate-pulse',
    ended: 'text-zinc-400',
    analyzed: 'text-accent-emerald',
  };
  return <span className={cn('font-mono text-[10px] uppercase', map[status] ?? 'text-zinc-400')}>{status}</span>;
}

function humanDelta(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}
