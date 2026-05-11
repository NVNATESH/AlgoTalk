'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Circle, Search, AlertCircle, Filter, Building2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ProblemsHeroCards } from '@/components/problem/ProblemsHeroCards';
import { api, ApiError } from '@/lib/api';
import type { Difficulty, ProblemSummary, UserStatus } from '@/types/problem';
import { cn } from '@/lib/utils';

type Tab = 'all' | UserStatus;

const ALL_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [tab, setTab] = useState<Tab>('all');

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (difficulties.length) params.set('difficulty', difficulties.join(','));
    if (tab !== 'all') params.set('status', tab);
    api<{ problems: ProblemSummary[]; total: number }>(`/problems?${params.toString()}`, {
      auth: true,
    })
      .then((r) => {
        if (!cancelled) {
          setProblems(r.problems);
          setTotal(r.total);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, difficulties, tab]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    problems.forEach((p) => p.tags.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [problems]);

  const toggleDifficulty = (d: Difficulty) => {
    setDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">📝 Problems</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Solve, run against test cases, get AI hints. Code runs on real compilers.
          </p>
        </div>
        <Link
          href="/problems/companies"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:border-accent-violet/40 hover:bg-white/10"
        >
          <Building2 className="h-4 w-4" /> Browse by company
        </Link>
      </header>

      {/* ── Hero Cards: Interview / Quests / Recommended Goals ── */}
      <ProblemsHeroCards />

      <div className="mb-5 flex flex-col gap-3">
        {/* Search + Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or slug..."
              className="input-base pl-9"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-zinc-500" />
            {ALL_DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => toggleDifficulty(d)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  difficulties.includes(d)
                    ? d === 'Easy'
                      ? 'border-accent-emerald/60 bg-accent-emerald/15 text-accent-emerald'
                      : d === 'Medium'
                        ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                        : 'border-accent-rose/60 bg-accent-rose/15 text-accent-rose'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-white/5 pb-2">
          {(['all', 'solved', 'attempted', 'unsolved'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition',
                tab === t ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
              )}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-500">
            {loading ? 'Loading…' : `${problems.length} of ${total}`}
          </span>
        </div>
      </div>

      {error ? (
        <div className="glass flex items-center gap-2 p-6 text-accent-rose">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      ) : loading && !problems.length ? (
        <SkeletonTable />
      ) : problems.length === 0 ? (
        <div className="glass p-10 text-center">
          <div className="text-5xl">🔍</div>
          <h3 className="mt-3 font-display text-lg font-semibold">No problems match</h3>
          <p className="mt-1 text-sm text-zinc-400">Try adjusting your filters or search.</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 w-12">Status</th>
                <th className="px-4 py-3">Problem</th>
                <th className="hidden px-4 py-3 md:table-cell">Tags</th>
                <th className="px-4 py-3 text-right">Acceptance</th>
                <th className="px-4 py-3 text-right">Difficulty</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {problems.map((p, i) => (
                <ProblemRow key={p.id} problem={p} index={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

const ProblemRow = memo(function ProblemRow({
  problem: p,
  index,
}: {
  problem: ProblemSummary;
  index: number;
}) {
  // Cap stagger at ~250ms so long lists don't drip in for seconds.
  const delay = Math.min(index * 0.015, 0.25);
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.18 }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)', x: 2 }}
      className="border-b border-white/5 transition"
    >
      <td className="px-4 py-3">
        {p.userStatus === 'solved' ? (
          <CheckCircle2 className="h-4 w-4 text-accent-emerald" />
        ) : p.userStatus === 'attempted' ? (
          <Circle className="h-4 w-4 fill-amber-400/30 text-amber-400" />
        ) : (
          <Circle className="h-4 w-4 text-zinc-700" />
        )}
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/solve/${p.slug}`}
          className="font-medium text-zinc-100 hover:text-accent-violet"
        >
          {p.title}
        </Link>
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <div className="flex flex-wrap gap-1">
          {p.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500"
            >
              {t}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-zinc-400">
        {p.acceptanceRate === null ? '—' : `${p.acceptanceRate}%`}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
            p.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
            p.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            p.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
          )}
        >
          {p.difficulty}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/solve/${p.slug}`}
          className="text-zinc-500 transition hover:text-zinc-200"
          aria-label="Solve"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </motion.tr>
  );
});

function SkeletonTable() {
  return (
    <div className="glass overflow-hidden">
      <div className="space-y-px">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-4 border-b border-white/5 p-4">
            <div className="h-4 w-4 rounded-full bg-white/5" />
            <div className="h-4 flex-1 rounded bg-white/5" />
            <div className="hidden h-4 w-32 rounded bg-white/5 md:block" />
            <div className="h-4 w-12 rounded bg-white/5" />
            <div className="h-4 w-16 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
