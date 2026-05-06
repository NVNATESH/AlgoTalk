'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Search,
  AlertCircle,
  Filter,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { Difficulty, ProblemSummary, UserStatus } from '@/types/problem';
import { cn } from '@/lib/utils';

type Tab = 'all' | UserStatus;

const ALL_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export default function CompanyProblemsPage() {
  const params = useParams<{ company: string }>();
  const company = decodeURIComponent(params.company ?? '');

  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('companies', company);
    if (debouncedSearch) qs.set('search', debouncedSearch);
    if (difficulties.length) qs.set('difficulty', difficulties.join(','));
    if (tab !== 'all') qs.set('status', tab);
    qs.set('limit', '100');
    api<{ problems: ProblemSummary[]; total: number }>(`/problems?${qs}`, { auth: true })
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
  }, [company, debouncedSearch, difficulties, tab]);

  const stats = useMemo(() => {
    const easy = problems.filter((p) => p.difficulty === 'Easy').length;
    const medium = problems.filter((p) => p.difficulty === 'Medium').length;
    const hard = problems.filter((p) => p.difficulty === 'Hard').length;
    const solved = problems.filter((p) => p.userStatus === 'solved').length;
    return { easy, medium, hard, solved };
  }, [problems]);

  const toggleDifficulty = (d: Difficulty) => {
    setDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  return (
    <AppShell>
      <header className="mb-6">
        <Link
          href="/problems/companies"
          className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-3 w-3" /> All companies
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/10 text-accent-violet">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{company}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {total} problem{total === 1 ? '' : 's'} tagged for {company}
              {stats.solved > 0 && ` · you've solved ${stats.solved}`}
            </p>
          </div>
        </div>

        {problems.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-1 text-accent-emerald">
              Easy: {stats.easy}
            </span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-300">
              Medium: {stats.medium}
            </span>
            <span className="rounded-full border border-accent-rose/30 bg-accent-rose/10 px-3 py-1 text-accent-rose">
              Hard: {stats.hard}
            </span>
          </div>
        )}
      </header>

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${company} problems...`}
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
        </div>
      </div>

      {error ? (
        <div className="glass flex items-center gap-2 p-6 text-accent-rose">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      ) : loading && !problems.length ? (
        <div className="glass h-64 animate-pulse" />
      ) : problems.length === 0 ? (
        <div className="glass p-10 text-center">
          <div className="text-5xl">🔍</div>
          <h3 className="mt-3 font-display text-lg font-semibold">
            No problems match in {company}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Try clearing filters or pick a different company.
          </p>
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
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-white/5 transition hover:bg-white/[0.03]"
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
                        p.difficulty === 'Easy' &&
                          'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                        p.difficulty === 'Medium' &&
                          'border-amber-500/30 bg-amber-500/10 text-amber-300',
                        p.difficulty === 'Hard' &&
                          'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
