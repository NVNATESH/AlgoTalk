'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  ChevronRight,
  BookOpen,
  Sparkles,
  Target,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { useGoals } from '@/stores/goalStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProblemSummary, Difficulty } from '@/types/problem';

const ALL_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export default function CompanyDetailPage() {
  const params = useParams();
  const slug = decodeURIComponent((params?.slug as string) ?? '');
  const companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);

  const { fetchCompanyGoals, enrollInGoal } = useGoals();
  const [companyGoals, setCompanyGoals] = useState<{ userGoals: any[]; templates: any[] }>({ userGoals: [], templates: [] });
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('company', companyName);
    if (search) params.set('search', search);
    if (difficulties.length) params.set('difficulty', difficulties.join(','));

    api<{ problems: ProblemSummary[]; total: number }>(`/problems?${params.toString()}`, { auth: true })
      .then((r) => {
        setProblems(r.problems ?? []);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug, search, difficulties, companyName]);

  useEffect(() => {
    if (!companyName) return;
    fetchCompanyGoals(companyName)
      .then(setCompanyGoals)
      .catch(() => {});
  }, [companyName, fetchCompanyGoals]);

  const handleEnroll = async (templateId: string) => {
    setEnrolling(templateId);
    try {
      await enrollInGoal(templateId, { deadlineDays: 30 });
      toast.success('Goal added to your dashboard!');
      fetchCompanyGoals(companyName).then(setCompanyGoals).catch(() => {});
    } catch {
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  };

  const toggleDifficulty = (d: Difficulty) => {
    setDifficulties((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const stats = useMemo(() => {
    const easy = problems.filter(p => p.difficulty === 'Easy').length;
    const medium = problems.filter(p => p.difficulty === 'Medium').length;
    const hard = problems.filter(p => p.difficulty === 'Hard').length;
    return { total: problems.length, easy, medium, hard };
  }, [problems]);

  return (
    <AppShell>
      <header className="mb-6">
        <Link href="/problems/companies" className="mb-3 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition">
          <ArrowLeft className="h-3 w-3" /> Back to companies
        </Link>
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{companyName} Interview Preparation</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Practice {stats.total} questions asked at {companyName}
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-1 text-xs font-medium text-accent-emerald">
            Easy {stats.easy}
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            Medium {stats.medium}
          </span>
          <span className="rounded-full border border-accent-rose/30 bg-accent-rose/10 px-3 py-1 text-xs font-medium text-accent-rose">
            Hard {stats.hard}
          </span>
        </div>
      </header>

      {/* Goal templates for this company */}
      {companyGoals.templates.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-display text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-accent-fuchsia" /> Preparation Goals
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {companyGoals.templates.map((g: any) => {
              const isEnrolled = companyGoals.userGoals.some((ug: any) => ug.templateId === g.id);
              return (
                <div key={g.id} className="glass shrink-0 w-72 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{g.icon}</span>
                    <h3 className="font-display text-sm font-semibold truncate">{g.name}</h3>
                  </div>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 mb-3">{g.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600 mb-3">
                    <span><BookOpen className="inline h-2.5 w-2.5" /> {g.modules?.length ?? 0} modules</span>
                    <span>· {g.estimatedHours}h</span>
                  </div>
                  {isEnrolled ? (
                    <Link href="/dashboard" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-2 text-xs font-medium text-accent-emerald hover:bg-accent-emerald/20 transition">
                      ✓ Enrolled
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleEnroll(g.id)}
                      disabled={enrolling === g.id}
                      className="btn-primary w-full py-2 text-xs"
                    >
                      {enrolling === g.id ? 'Enrolling...' : '+ Start Preparation'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Search + Filters */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${companyName} questions...`}
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
      </div>

      {/* Problems List */}
      {error ? (
        <div className="glass flex items-center gap-2 p-6 text-accent-rose">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      ) : loading ? (
        <div className="glass overflow-hidden">
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 border-b border-white/5 p-4">
                <div className="h-4 w-4 rounded-full bg-white/5" />
                <div className="h-4 flex-1 rounded bg-white/5" />
                <div className="h-4 w-16 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      ) : problems.length === 0 ? (
        <div className="glass p-10 text-center">
          <div className="text-5xl">🔍</div>
          <h3 className="mt-3 font-display text-lg font-semibold">No questions found</h3>
          <p className="mt-1 text-sm text-zinc-400">
            No problems tagged with {companyName} yet. Try browsing all problems.
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
                  transition={{ delay: Math.min(i * 0.015, 0.25) }}
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
                    <Link href={`/solve/${p.slug}`} className="font-medium text-zinc-100 hover:text-accent-violet">
                      {p.title}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-zinc-400">
                    {p.acceptanceRate === null ? '—' : `${p.acceptanceRate}%`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
                      p.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                      p.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                      p.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                    )}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/solve/${p.slug}`} className="text-zinc-500 transition hover:text-zinc-200" aria-label="Solve">
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
