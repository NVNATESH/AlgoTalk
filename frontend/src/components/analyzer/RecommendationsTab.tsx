'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { CfRatingZone, NextProblemRecommendation } from '@/types/analyzer';
import { PlatformIcon, platformLabel } from '@/components/integrations/PlatformIcon';
import type { Platform } from '@/types/integration';
import { cn } from '@/lib/utils';

/**
 * "What to solve next" — now built around the cross-platform multi-pick
 * endpoint that reads every connected platform's last submission, weak topics,
 * and CF rating zone. Falls back to the LearnHub-catalog pick as a secondary
 * suggestion at the bottom of the page.
 */

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
  cfRatingZone: CfRatingZone | null;
}

export function RecommendationsTab() {
  const [data, setData] = useState<CrossRecResponse | null>(null);
  const [internal, setInternal] = useState<NextProblemRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<CrossRecResponse>('/analyzer/recommend/cross-platform', {
        method: 'POST',
        auth: true,
      });
      setData(r);
      // Kick off the internal-catalog pick in parallel — it's the same call
      // that used to power this tab; we still surface it as a "from your
      // LearnHub catalog" fallback so users can solve right inside the app.
      void loadInternal();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not recommend');
    } finally {
      setLoading(false);
    }
  };

  const loadInternal = async () => {
    setInternalLoading(true);
    try {
      const r = await api<NextProblemRecommendation>('/analyzer/recommend', {
        method: 'POST',
        auth: true,
      });
      setInternal(r);
    } catch {
      // Best-effort — internal pick is secondary, swallow errors.
    } finally {
      setInternalLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="glass p-10 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-accent-violet" />
        <p className="mt-3 text-sm text-zinc-400">
          Reading your platform intel and picking 5 problems…
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass p-6">
        <div className="flex items-start gap-2 text-sm text-accent-rose">
          <Target className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button onClick={generate} className="btn-ghost mt-4 text-sm">
          <Sparkles className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass p-10 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
          <Sparkles className="h-7 w-7 text-accent-violet" />
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold">What should I solve next?</h3>
        <p className="mt-1 max-w-md mx-auto text-sm text-zinc-400">
          Gemini reads your last submission on every connected platform, your weak topics, and your
          Codeforces rating zone — then picks 5 problems across the right mix of platforms.
        </p>
        <button onClick={generate} className="btn-primary mt-5">
          <Sparkles className="h-4 w-4" /> Recommend across all platforms
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {data.cfRatingZone && <RatingZoneCallout zone={data.cfRatingZone} />}

      <section className="glass p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
          Headline
        </div>
        <p className="mt-1 text-sm text-zinc-200">{data.summary}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-400">
          <div>
            <span className="text-zinc-500">Pacing:</span> {data.pacingAdvice}
          </div>
          {data.weakTopicsToDrill.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
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
      </section>

      {data.platformsConnected === 0 && (
        <section className="glass border-amber-400/30 p-4">
          <div className="flex items-start gap-3 text-sm">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div className="text-zinc-300">
              No external platforms connected — recommendations are based only on the LearnHub
              catalog.{' '}
              <Link href="/integrations" className="text-accent-violet hover:underline">
                Connect one →
              </Link>
            </div>
          </div>
        </section>
      )}

      {data.recommendations.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.recommendations.map((r, i) => (
            <RecCard key={i} rec={r} index={i} />
          ))}
        </div>
      )}

      {(internal || internalLoading) && (
        <section className="glass p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent-cyan">
            <Sparkles className="h-3.5 w-3.5" /> From your LearnHub catalog
          </div>
          {internalLoading && !internal ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Picking an internal problem…
            </div>
          ) : internal && internal.pickedProblem ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold leading-tight">
                    {internal.pickedProblem.title}
                  </h3>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
                      internal.pickedProblem.difficulty === 'Easy' &&
                        'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                      internal.pickedProblem.difficulty === 'Medium' &&
                        'border-amber-500/30 bg-amber-500/10 text-amber-300',
                      internal.pickedProblem.difficulty === 'Hard' &&
                        'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                    )}
                  >
                    {internal.pickedProblem.difficulty}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-400">
                  {internal.recommendation.reasoning}
                </p>
              </div>
              <Link href={`/solve/${internal.pickedProblem.slug}`} className="btn-primary text-sm">
                Solve in LearnHub <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : internal ? (
            <p className="text-sm text-zinc-400">{internal.recommendation.reasoning}</p>
          ) : null}
        </section>
      )}

      <div className="flex justify-center pt-2">
        <button
          onClick={generate}
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
    </motion.div>
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
        <ExternalLink className="h-4 w-4" /> Open on {platformLabel(rec.platform)}
      </a>
    </motion.div>
  );
}

function RatingZoneCallout({ zone }: { zone: CfRatingZone }) {
  return (
    <section className="glass border-accent-cyan/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
            Codeforces skill zone
          </div>
          <p className="mt-1 text-sm text-zinc-200">
            {zone.comfortBand ? (
              <>
                You're solid at{' '}
                <span className="font-mono font-semibold tabular-nums text-zinc-100">
                  {zone.comfortBand.low}–{zone.comfortBand.high + 99}
                </span>{' '}
                ({zone.comfortBand.acceptanceRate}% accept).
              </>
            ) : (
              <>No consistent rating band yet — keep building volume.</>
            )}
            {zone.growthBand && (
              <>
                {' '}
                <span className="text-zinc-400">Stretch toward </span>
                <span className="font-mono font-semibold tabular-nums text-zinc-100">
                  {zone.growthBand.low}–{zone.growthBand.high + 99}
                </span>
                <span className="text-zinc-400">
                  {' '}
                  ({zone.growthBand.acceptanceRate}% accept) to push your ceiling.
                </span>
              </>
            )}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Recommendations above are biased toward this growth band.
          </p>
        </div>
      </div>
    </section>
  );
}
