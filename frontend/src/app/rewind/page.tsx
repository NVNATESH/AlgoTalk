'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Code2,
  Flame,
  Loader2,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { MonthChart } from '@/components/rewind/MonthChart';
import { StoryMode } from '@/components/rewind/StoryMode';
import { AiInsightsPanel } from '@/components/rewind/AiInsights';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
import type { RewindData, RewindInsights, RewindInsightsResult } from '@/types/rewind';
import { cn } from '@/lib/utils';

export default function RewindPage() {
  const user = useAuth((s) => s.user);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState<RewindData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [insights, setInsights] = useState<RewindInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [storyOpen, setStoryOpen] = useState(false);

  // Fetch rewind data when year changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInsights(null);
    setInsightsError(null);
    api<{ rewind: RewindData }>(`/rewind?year=${year}`, { auth: true })
      .then((r) => !cancelled && setData(r.rewind))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load rewind');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [year]);

  const generateInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const r = await api<RewindInsightsResult>('/rewind/insights', {
        method: 'POST',
        auth: true,
        body: { year },
      });
      setInsights(r.insights);
    } catch (e) {
      setInsightsError(e instanceof ApiError ? e.message : 'Failed to generate insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const langLabel: Record<string, string> = {
    python: 'Python',
    javascript: 'JavaScript',
    java: 'Java',
    cpp: 'C++',
  };

  if (loading && !data) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-accent-rose" />
          <h2 className="mt-3 font-display text-xl font-semibold">Couldn't load rewind</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
        </div>
      </AppShell>
    );
  }

  const noData = !data.hasData;

  return (
    <AppShell>
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-accent-violet/30 via-accent-fuchsia/15 to-accent-cyan/20 p-8 md:p-10"
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-violet/30 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-accent-fuchsia/20 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
              <Sparkles className="h-3 w-3" /> Rewind
            </div>
            <h1 className="mt-2 font-display text-5xl font-bold leading-tight md:text-6xl">
              Your <span className="gradient-text">{year}</span> in code
            </h1>
            <p className="mt-2 max-w-xl text-zinc-300">
              {noData
                ? "No activity this year yet — solve a problem to start writing your rewind."
                : `${data.totals.distinctSolved} problem${data.totals.distinctSolved === 1 ? '' : 's'} solved across ${data.totals.activeDays} active day${data.totals.activeDays === 1 ? '' : 's'}.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <YearPicker year={year} setYear={setYear} thisYear={thisYear} />
            <button
              onClick={() => setStoryOpen(true)}
              disabled={noData}
              className="btn-primary disabled:opacity-50"
            >
              <PlayCircle className="h-4 w-4" /> Play Rewind
            </button>
          </div>
        </div>
      </motion.header>

      {noData ? (
        <div className="glass p-10 text-center">
          <div className="text-5xl">🌱</div>
          <h3 className="mt-3 font-display text-lg font-semibold">Nothing to rewind yet</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Pick a different year above, or head to{' '}
            <a href="/problems" className="link-accent">
              problems
            </a>{' '}
            and start solving.
          </p>
        </div>
      ) : (
        <>
          {/* Big number stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <BigStat icon={Trophy} tint="violet" big={data.totals.distinctSolved} label="Problems solved" />
            <BigStat icon={Code2} tint="cyan" big={data.totals.submissions} label="Submissions" />
            <BigStat
              icon={Flame}
              tint="amber"
              big={data.totals.longestStreak}
              label={`Longest streak (day${data.totals.longestStreak === 1 ? '' : 's'})`}
            />
            <BigStat
              icon={Calendar}
              tint="emerald"
              big={data.totals.activeDays}
              label="Active days"
            />
          </div>

          {/* Headline cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.bestMonth && (
              <HeadlineCard
                kicker="Peak month"
                emoji="🚀"
                big={data.bestMonth.monthLabel}
                detail={`${data.bestMonth.solved} problem${data.bestMonth.solved === 1 ? '' : 's'} solved`}
                tint="amber"
              />
            )}
            {data.topLanguage && (
              <HeadlineCard
                kicker="Top language"
                emoji="🧠"
                big={langLabel[data.topLanguage.language] ?? data.topLanguage.language}
                detail={`${data.topLanguage.pct}% of all submissions (${data.topLanguage.count})`}
                tint="cyan"
              />
            )}
            {data.topTopics[0] && (
              <HeadlineCard
                kicker="Top topic"
                emoji="🎯"
                big={data.topTopics[0].topic}
                detail={`${data.topTopics[0].solvedCount} solved`}
                tint="violet"
              />
            )}
          </div>

          {/* Monthly chart */}
          <section className="glass mb-6 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Monthly breakdown</h3>
                <p className="text-xs text-zinc-500">Stacked by difficulty — each segment shows distinct first-time solves.</p>
              </div>
            </div>
            <MonthChart months={data.monthly} />
          </section>

          {/* AI Insights */}
          <div className="mb-6">
            <AiInsightsPanel
              insights={insights}
              loading={insightsLoading}
              error={insightsError}
              onGenerate={generateInsights}
            />
          </div>

          {/* H1 vs H2 + Topics */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="glass p-6">
              <h3 className="font-display text-lg font-semibold">H1 vs H2</h3>
              <p className="text-xs text-zinc-500">First half of the year vs second half.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <HalfCard label="H1 (Jan–Jun)" agg={data.h1} tint="violet" />
                <HalfCard label="H2 (Jul–Dec)" agg={data.h2} tint="cyan" />
              </div>
            </section>
            <section className="glass p-6">
              <h3 className="font-display text-lg font-semibold">Top topics</h3>
              <p className="text-xs text-zinc-500">Tags from problems you solved.</p>
              {data.topTopics.length === 0 ? (
                <div className="mt-4 text-sm text-zinc-500">No topics yet.</div>
              ) : (
                <ul className="mt-4 space-y-1.5">
                  {data.topTopics.map((t, i) => (
                    <TopicRow key={t.topic} rank={i + 1} topic={t.topic} count={t.solvedCount} max={data.topTopics[0].solvedCount} />
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Milestones */}
          <section className="glass p-6">
            <h3 className="font-display text-lg font-semibold">Milestones</h3>
            <p className="text-xs text-zinc-500">Key moments from your year.</p>
            {data.milestones.length === 0 ? (
              <div className="mt-4 text-sm text-zinc-500">No milestones yet.</div>
            ) : (
              <ol className="mt-4 space-y-2">
                {data.milestones.map((m, i) => (
                  <li
                    key={`${m.type}-${m.date}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                  >
                    <span className="text-xl">{milestoneEmoji(m.type)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-100">{m.label}</div>
                      {m.detail && <div className="truncate text-xs text-zinc-500">{m.detail}</div>}
                    </div>
                    <span className="font-mono text-xs tabular-nums text-zinc-500">
                      {new Date(m.date + 'T00:00:00').toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      <StoryMode
        open={storyOpen}
        onClose={() => setStoryOpen(false)}
        data={data}
        userName={user?.name ?? 'You'}
        insights={insights}
      />
    </AppShell>
  );
}

function YearPicker({
  year,
  setYear,
  thisYear,
}: {
  year: number;
  setYear: (y: number) => void;
  thisYear: number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
      <button
        onClick={() => setYear(year - 1)}
        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
        aria-label="Previous year"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="px-3 font-mono text-sm font-semibold tabular-nums">{year}</div>
      <button
        onClick={() => setYear(year + 1)}
        disabled={year >= thisYear}
        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100 disabled:opacity-30"
        aria-label="Next year"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function BigStat({
  icon: Icon,
  big,
  label,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  big: number;
  label: string;
  tint: 'violet' | 'cyan' | 'amber' | 'emerald';
}) {
  const map = {
    violet: 'from-accent-violet/30 to-accent-violet/5 text-accent-violet',
    cyan: 'from-accent-cyan/30 to-accent-cyan/5 text-accent-cyan',
    amber: 'from-amber-500/30 to-amber-500/5 text-amber-300',
    emerald: 'from-accent-emerald/30 to-accent-emerald/5 text-accent-emerald',
  } as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5"
    >
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br', map[tint])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-display text-4xl font-bold tabular-nums">{big.toLocaleString()}</div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </motion.div>
  );
}

function HeadlineCard({
  kicker,
  emoji,
  big,
  detail,
  tint,
}: {
  kicker: string;
  emoji: string;
  big: string | number;
  detail: string;
  tint: 'violet' | 'cyan' | 'amber';
}) {
  const map = {
    violet: 'from-accent-violet/20 to-transparent border-accent-violet/30',
    cyan: 'from-accent-cyan/20 to-transparent border-accent-cyan/30',
    amber: 'from-amber-500/20 to-transparent border-amber-500/30',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-xl',
        map[tint]
      )}
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
        <span>{emoji}</span> {kicker}
      </div>
      <div className="mt-2 font-display text-3xl font-bold leading-tight">{big}</div>
      <div className="mt-1 text-sm text-zinc-300">{detail}</div>
    </motion.div>
  );
}

function HalfCard({
  label,
  agg,
  tint,
}: {
  label: string;
  agg: { submissions: number; accepted: number; distinctSolved: number; activeDays: number };
  tint: 'violet' | 'cyan';
}) {
  const cls = tint === 'violet' ? 'border-accent-violet/30 bg-accent-violet/5' : 'border-accent-cyan/30 bg-accent-cyan/5';
  return (
    <div className={cn('rounded-xl border p-4', cls)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums">{agg.distinctSolved}</div>
      <div className="text-[10px] text-zinc-500">distinct solved</div>
      <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
        <span>{agg.submissions} subs</span>
        <span>{agg.activeDays} days</span>
      </div>
    </div>
  );
}

function TopicRow({
  rank,
  topic,
  count,
  max,
}: {
  rank: number;
  topic: string;
  count: number;
  max: number;
}) {
  const pct = max === 0 ? 0 : (count / max) * 100;
  return (
    <li className="grid grid-cols-[24px_1fr_36px] items-center gap-2 text-sm">
      <span className="font-mono text-xs text-zinc-500">#{rank}</span>
      <div className="min-w-0">
        <div className="flex items-center justify-between text-zinc-200">
          <span className="truncate">{topic}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, delay: rank * 0.04 }}
            className="h-full bg-gradient-to-r from-accent-violet to-accent-fuchsia"
          />
        </div>
      </div>
      <span className="text-right font-mono text-xs tabular-nums text-zinc-300">{count}</span>
    </li>
  );
}

function milestoneEmoji(t: string): string {
  switch (t) {
    case 'first_submission':
      return '🚀';
    case 'first_solve':
      return '✅';
    case 'count_milestone':
      return '🎯';
    case 'streak_milestone':
      return '🔥';
    case 'first_hard':
      return '💎';
    case 'language_first':
      return '🧠';
    case 'most_productive_day':
      return '⚡';
    default:
      return '⭐';
  }
}
