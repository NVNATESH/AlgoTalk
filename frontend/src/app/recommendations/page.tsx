'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Flame,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { PlatformIcon, platformLabel } from '@/components/integrations/PlatformIcon';
import type { Platform } from '@/types/integration';
import { cn } from '@/lib/utils';

interface PlatformPulse {
  platform: Platform;
  handle: string;
  displayName: string;
  rating: number | null;
  rank: string;
  isActive: boolean;
  lastSyncAt: string | null;
  submissionCount: number;
  acceptedCount: number;
  lastSubmission: {
    problemId: string;
    problemTitle: string;
    problemUrl: string;
    status: string;
    difficulty: string;
    language: string;
    submittedAt: string;
    daysSince: number | null;
  } | null;
}

interface HeatmapDay {
  date: string;
  total: number;
  accepted: number;
  byPlatform: Record<string, number>;
}

interface HeatmapResponse {
  days: HeatmapDay[];
  totalSubmissions: number;
  totalAccepted: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
}

interface CrossRec {
  platform: Platform;
  problemTitle: string;
  problemUrl: string;
  difficulty: string;
  topic: string;
  why: string;
  estimatedTimeMinutes: number;
}

interface CrossRecResponse {
  summary: string;
  recommendations: CrossRec[];
  weakTopicsToDrill: string[];
  pacingAdvice: string;
  platformsConnected: number;
  cfRatingZone: {
    ceiling: number;
    comfortBand: { low: number; high: number; acceptanceRate: number } | null;
    growthBand: { low: number; high: number; acceptanceRate: number } | null;
  } | null;
}

export default function RecommendationsPage() {
  const [platforms, setPlatforms] = useState<PlatformPulse[] | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [recs, setRecs] = useState<CrossRecResponse | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ platforms: PlatformPulse[] }>('/integrations/last-by-platform', { auth: true })
      .then((r) => {
        if (!cancelled) setPlatforms(r.platforms);
      })
      .catch(() => !cancelled && setPlatforms([]));
    api<HeatmapResponse>('/integrations/heatmap?days=365', { auth: true })
      .then((r) => {
        if (!cancelled) setHeatmap(r);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    setRecsLoading(true);
    setRecsError(null);
    try {
      const r = await api<CrossRecResponse>('/analyzer/recommend/cross-platform', {
        method: 'POST',
        auth: true,
      });
      setRecs(r);
    } catch (e) {
      setRecsError(e instanceof ApiError ? e.message : 'Could not generate');
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setRecsLoading(false);
    }
  };

  return (
    <AppShell>
      <header className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-accent-violet">
            <Sparkles className="h-3 w-3" /> Cross-platform AI
          </div>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight md:text-5xl">
            🧭 What should I solve next?
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Latest pulse from every platform you've connected, your activity heatmap across all of
            them, and AI-picked next problems tuned to your weak topics + Codeforces rating zone.
          </p>
        </motion.div>
      </header>

      <PlatformPulseStrip platforms={platforms} />

      <UnifiedHeatmap heatmap={heatmap} />

      <CrossPlatformRecs
        data={recs}
        loading={recsLoading}
        error={recsError}
        onGenerate={generate}
      />
    </AppShell>
  );
}

function PlatformPulseStrip({ platforms }: { platforms: PlatformPulse[] | null }) {
  if (platforms === null) {
    return (
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass h-32 animate-pulse" />
        ))}
      </section>
    );
  }
  if (platforms.length === 0) {
    return (
      <section className="glass mb-6 p-6 text-center">
        <Target className="mx-auto h-10 w-10 text-zinc-600" />
        <h3 className="mt-3 font-display text-lg font-semibold">No platforms connected</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Connect at least one external judge so the recommender has real data to work with.
        </p>
        <Link href="/integrations" className="btn-primary mt-4 inline-flex">
          <ExternalLink className="h-4 w-4" /> Connect a platform
        </Link>
      </section>
    );
  }
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Latest activity per platform</h2>
          <p className="text-[11px] text-zinc-500">
            Last submission, status, and how long ago — pulled from the most recent sync.
          </p>
        </div>
        <Link
          href="/integrations"
          className="text-[11px] text-accent-violet hover:underline"
        >
          Manage →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {platforms.map((p, i) => (
          <PlatformCard key={p.platform} pulse={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function PlatformCard({ pulse, index }: { pulse: PlatformPulse; index: number }) {
  const last = pulse.lastSubmission;
  const stale = !last || (last.daysSince !== null && last.daysSince > 14);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass flex flex-col gap-3 p-4"
    >
      <div className="flex items-center gap-3">
        <PlatformIcon platform={pulse.platform} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-semibold">
            {platformLabel(pulse.platform)}
          </div>
          <div className="truncate font-mono text-[11px] text-zinc-500">@{pulse.handle}</div>
        </div>
        {stale && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase text-amber-300">
            Stale
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
        {pulse.rating !== null && (
          <span className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5">
            ⭐ {pulse.rating}
          </span>
        )}
        <span className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5">
          {pulse.acceptedCount}/{pulse.submissionCount} accepted
        </span>
      </div>

      {last ? (
        <a
          href={last.problemUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-accent-violet/30 hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>Last submission</span>
            <span className="text-zinc-600">·</span>
            <span
              className={cn(
                last.status === 'accepted' ? 'text-accent-emerald' : 'text-accent-rose'
              )}
            >
              {last.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-1 line-clamp-2 text-[13px] font-medium text-zinc-100">
            {last.problemTitle}
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {last.daysSince === 0
              ? 'today'
              : last.daysSince === 1
                ? 'yesterday'
                : `${last.daysSince} days ago`}
            {last.language && ` · ${last.language}`}
          </div>
        </a>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-2.5 text-[11px] text-zinc-500">
          No submissions pulled yet — try a manual sync.
        </div>
      )}
    </motion.div>
  );
}

function UnifiedHeatmap({ heatmap }: { heatmap: HeatmapResponse | null }) {
  const cells = useMemo(() => {
    if (!heatmap) return null;
    // Pack into 53 weeks × 7 days. The first column may be partial; align so
    // the rightmost column is "this week".
    const days = heatmap.days;
    if (days.length === 0) return null;
    const max = Math.max(...days.map((d) => d.total));
    const cols: HeatmapDay[][] = [];
    let week: HeatmapDay[] = [];
    const firstDay = new Date(days[0].date + 'T00:00:00Z').getUTCDay();
    for (let i = 0; i < firstDay; i++) week.push(null as any);
    for (const d of days) {
      week.push(d);
      if (week.length === 7) {
        cols.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null as any);
      cols.push(week);
    }
    return { cols, max };
  }, [heatmap]);

  if (!heatmap || !cells) {
    return (
      <section className="glass mb-6 h-56 animate-pulse p-5" />
    );
  }

  const intensity = (n: number) => {
    if (n === 0) return 'bg-white/[0.03] border-white/[0.04]';
    const ratio = n / Math.max(1, cells.max);
    if (ratio > 0.75) return 'bg-accent-violet/90 border-accent-violet';
    if (ratio > 0.5) return 'bg-accent-violet/70 border-accent-violet/70';
    if (ratio > 0.25) return 'bg-accent-violet/45 border-accent-violet/40';
    return 'bg-accent-violet/20 border-accent-violet/20';
  };

  return (
    <section className="glass mb-6 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Unified activity heatmap</h2>
          <p className="text-[11px] text-zinc-500">
            Submissions across every platform — LearnHub, LeetCode, Codeforces, CodeChef, AtCoder,
            HackerRank, GFG, HackerEarth — over the last 365 days.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
          <Stat icon={Calendar} label="Active days" value={String(heatmap.activeDays)} />
          <Stat
            icon={Flame}
            label="Current streak"
            value={`${heatmap.currentStreak}d`}
            tint="violet"
          />
          <Stat icon={TrendingUp} label="Longest streak" value={`${heatmap.longestStreak}d`} />
          <Stat
            icon={CheckCircle2}
            label="Accepted"
            value={`${heatmap.totalAccepted}/${heatmap.totalSubmissions}`}
            tint="emerald"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          {cells.cols.map((week, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {week.map((d, di) =>
                d ? (
                  <div
                    key={di}
                    title={`${d.date}: ${d.total} submission${d.total === 1 ? '' : 's'} (${d.accepted} accepted)\n${
                      Object.entries(d.byPlatform)
                        .map(([k, v]) => `· ${k}: ${v}`)
                        .join('\n') || ''
                    }`}
                    className={cn(
                      'h-[11px] w-[11px] rounded-[3px] border',
                      intensity(d.total)
                    )}
                  />
                ) : (
                  <div
                    key={di}
                    className="h-[11px] w-[11px] rounded-[3px] border border-transparent"
                  />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-zinc-500">
        <span>less</span>
        <div className="h-2.5 w-2.5 rounded-sm bg-white/[0.06]" />
        <div className="h-2.5 w-2.5 rounded-sm bg-accent-violet/20" />
        <div className="h-2.5 w-2.5 rounded-sm bg-accent-violet/45" />
        <div className="h-2.5 w-2.5 rounded-sm bg-accent-violet/70" />
        <div className="h-2.5 w-2.5 rounded-sm bg-accent-violet/90" />
        <span>more</span>
      </div>
    </section>
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
  tint?: 'violet' | 'emerald';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-1.5',
        tint === 'violet'
          ? 'border-accent-violet/25 bg-accent-violet/10 text-accent-violet'
          : tint === 'emerald'
            ? 'border-accent-emerald/25 bg-accent-emerald/10 text-accent-emerald'
            : 'border-white/10 bg-white/[0.03]'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <div>
        <div className="font-mono text-xs font-semibold tabular-nums leading-tight">{value}</div>
        <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      </div>
    </div>
  );
}

function CrossPlatformRecs({
  data,
  loading,
  error,
  onGenerate,
}: {
  data: CrossRecResponse | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  if (loading && !data) {
    return (
      <section className="glass p-10 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-accent-violet" />
        <p className="mt-3 text-sm text-zinc-400">
          Reading your platform intel and picking 5 problems…
        </p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="glass p-10 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
          <Sparkles className="h-7 w-7 text-accent-violet" />
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold">
          Get cross-platform recommendations
        </h3>
        <p className="mt-1 max-w-md mx-auto text-sm text-zinc-400">
          Gemini reads your last submissions, weak topics, and Codeforces rating zone, then picks 5
          specific problems across LeetCode, Codeforces, CodeChef, AtCoder, etc.
        </p>
        {error && <p className="mt-3 text-sm text-accent-rose">{error}</p>}
        <button onClick={onGenerate} className="btn-primary mt-5">
          <Sparkles className="h-4 w-4" /> Recommend 5 problems
        </button>
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <div className="glass p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
          Headline
        </div>
        <p className="mt-1 text-sm text-zinc-200">{data.summary}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-400">
          <div>
            <span className="text-zinc-500">Pacing:</span> {data.pacingAdvice}
          </div>
          {data.weakTopicsToDrill.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Drill:</span>
              {data.weakTopicsToDrill.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-amber-300"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {data.recommendations.map((r, i) => (
          <RecCard key={i} rec={r} index={i} />
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={onGenerate}
          disabled={loading}
          className="btn-ghost text-sm disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Recommend a fresh batch
            </>
          )}
        </button>
      </div>
    </section>
  );
}

function RecCard({ rec, index }: { rec: CrossRec; index: number }) {
  const diffColor =
    rec.difficulty.toLowerCase() === 'easy'
      ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
      : rec.difficulty.toLowerCase() === 'hard'
        ? 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass flex flex-col gap-3 p-5"
    >
      <div className="flex items-start gap-3">
        <PlatformIcon platform={rec.platform} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold leading-tight">
              {rec.problemTitle}
            </h3>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
                diffColor
              )}
            >
              {rec.difficulty}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
            <span>{platformLabel(rec.platform)}</span>
            <span>·</span>
            <span className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5">
              {rec.topic}
            </span>
            <span>·</span>
            <span>~{rec.estimatedTimeMinutes} min</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
          Why this one
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-200">{rec.why}</p>
      </div>

      <a
        href={rec.problemUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-primary w-full justify-center text-sm"
      >
        Open on {platformLabel(rec.platform)} <ArrowRight className="h-4 w-4" />
      </a>
    </motion.div>
  );
}
