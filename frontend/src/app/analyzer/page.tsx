'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Brain,
  Code2,
  Layers,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { TopicMasteryList } from '@/components/analyzer/TopicMasteryList';
import { PeakHoursHeatmap } from '@/components/analyzer/PeakHoursHeatmap';
import { RatingHistogram } from '@/components/analyzer/RatingHistogram';
import { CodeAnalyzerTab } from '@/components/analyzer/CodeAnalyzerTab';
import { ProgressInsightsTab } from '@/components/analyzer/ProgressInsightsTab';
import { RecommendationsTab } from '@/components/analyzer/RecommendationsTab';
import { api, ApiError } from '@/lib/api';
import type { AnalyzerOverview } from '@/types/analyzer';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'progress' | 'code' | 'recommend';

const STATUS_LABEL: Record<string, string> = {
  wrong_answer: 'Wrong Answer',
  tle: 'Time Limit',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
  mle: 'Memory Limit',
  execution_error: 'Exec Error',
};

export default function AnalyzerPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<AnalyzerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ overview: AnalyzerOverview }>('/analyzer/overview', { auth: true })
      .then((r) => !cancelled && setOverview(r.overview))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <header className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
              <Brain className="h-3 w-3" /> Analyzer
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">📊 Code & Progress Analyzer</h1>
            <p className="mt-1 text-sm text-zinc-400">
              AI insights into your strengths, your code, and what to do next.
            </p>
          </div>
        </motion.div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-white/5 pb-2">
        <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} icon={Layers}>
          Overview
        </TabBtn>
        <TabBtn active={tab === 'progress'} onClick={() => setTab('progress')} icon={Target}>
          Smart progress
        </TabBtn>
        <TabBtn active={tab === 'code'} onClick={() => setTab('code')} icon={Code2}>
          Code Analyzer
        </TabBtn>
        <TabBtn active={tab === 'recommend'} onClick={() => setTab('recommend')} icon={Lightbulb}>
          What to solve next
        </TabBtn>
      </div>

      {tab === 'overview' &&
        (loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
          </div>
        ) : error || !overview ? (
          <div className="glass p-6 text-sm text-accent-rose">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        ) : (
          <OverviewTab overview={overview} />
        ))}

      {tab === 'progress' && <ProgressInsightsTab />}
      {tab === 'code' && <CodeAnalyzerTab />}
      {tab === 'recommend' && <RecommendationsTab />}
    </AppShell>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition',
        active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function OverviewTab({ overview }: { overview: AnalyzerOverview }) {
  return (
    <div className="space-y-5">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Distinct solved"
          value={String(overview.totals.distinctSolved)}
          sub={`${overview.totals.acceptanceRate}% acceptance`}
          tint="emerald"
        />
        <Stat
          label="Submissions"
          value={String(overview.totals.submissions)}
          sub={`${overview.totals.accepted} accepted`}
          tint="violet"
        />
        <Stat
          label="Attempts to accept"
          value={overview.totals.avgAttemptsBeforeAccept !== null ? overview.totals.avgAttemptsBeforeAccept.toFixed(1) : '—'}
          sub="avg per solved problem"
          tint="cyan"
        />
        <Stat
          label="Best runtime"
          value={overview.totals.bestRuntimeMs !== null ? `${overview.totals.bestRuntimeMs}ms` : '—'}
          sub={overview.totals.avgRuntimeMs !== null ? `avg ${overview.totals.avgRuntimeMs}ms` : ''}
          tint="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Topic mastery */}
        <section className="glass col-span-1 p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Topic mastery</h3>
            <span className="text-xs text-zinc-500">{overview.topicMastery.length} topic{overview.topicMastery.length === 1 ? '' : 's'}</span>
          </div>
          <TopicMasteryList topics={overview.topicMastery} />
        </section>

        {/* Side: Failure patterns + by language */}
        <section className="glass space-y-5 p-6">
          <div>
            <h3 className="font-display text-base font-semibold">Failure patterns</h3>
            {overview.failurePatterns.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No failed submissions yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {overview.failurePatterns.map((f) => (
                  <li key={f.status} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">{STATUS_LABEL[f.status] ?? f.status}</span>
                    <span className="font-mono text-xs tabular-nums text-zinc-500">
                      {f.count} ({f.pct}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="font-display text-base font-semibold">By language</h3>
            {overview.byLanguage.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No submissions yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {overview.byLanguage.map((l) => (
                  <li key={l.language} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="capitalize text-zinc-200">{l.language}</span>
                      <span className="text-xs tabular-nums text-zinc-500">
                        {l.accepted}/{l.count} ({l.acceptanceRate}%)
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia"
                        style={{ width: `${l.acceptanceRate}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* CF rating histogram */}
      {overview.ratingDistribution && (
        <section className="glass p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Codeforces rating distribution</h3>
              <p className="text-xs text-zinc-500">
                Solved (filled) vs attempted (faded) bucketed by problem rating · 100-pt bins.
              </p>
            </div>
            <Target className="h-5 w-5 text-accent-violet" />
          </div>
          <RatingHistogram distribution={overview.ratingDistribution} />
        </section>
      )}

      {/* Peak hours */}
      <section className="glass p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">When you code best</h3>
            <p className="text-xs text-zinc-500">Submissions bucketed by day of week × hour.</p>
          </div>
          <Zap className="h-5 w-5 text-accent-violet" />
        </div>
        <PeakHoursHeatmap grid={overview.peakHours} max={overview.peakHourMax} best={overview.bestHourBucket} />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tint,
}: {
  label: string;
  value: string;
  sub?: string;
  tint: 'violet' | 'emerald' | 'cyan' | 'amber';
}) {
  const map = {
    violet: 'from-accent-violet/30 to-accent-violet/5 text-accent-violet',
    emerald: 'from-accent-emerald/30 to-accent-emerald/5 text-accent-emerald',
    cyan: 'from-accent-cyan/30 to-accent-cyan/5 text-accent-cyan',
    amber: 'from-amber-500/30 to-amber-500/5 text-amber-300',
  } as const;
  return (
    <div className="glass p-4">
      <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br', map[tint])}>
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}
