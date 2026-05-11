'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Globe2,
  Loader2,
  Plug,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { ConnectPlatformDialog } from '@/components/integrations/ConnectPlatformDialog';
import { PlatformIcon, platformLabel } from '@/components/integrations/PlatformIcon';
import { api, ApiError } from '@/lib/api';
import type {
  ExtractedSubmission,
  ExtractionStats,
  Integration,
  Platform,
} from '@/types/integration';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  tle: 'TLE',
  mle: 'MLE',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
  rejected: 'Rejected',
  pending: 'Pending',
  unknown: 'Unknown',
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [submissions, setSubmissions] = useState<ExtractedSubmission[]>([]);
  const [stats, setStats] = useState<ExtractionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [filter, setFilter] = useState<Platform | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<{ integrations: Integration[] }>('/integrations', { auth: true }),
      api<{ submissions: ExtractedSubmission[] }>('/integrations/submissions?limit=200', {
        auth: true,
      }),
      api<{ stats: ExtractionStats }>('/integrations/stats', { auth: true }),
    ])
      .then(([i, s, st]) => {
        if (cancelled) return;
        setIntegrations(i.integrations);
        setSubmissions(s.submissions);
        setStats(st.stats);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAll = async () => {
    try {
      const [s, st] = await Promise.all([
        api<{ submissions: ExtractedSubmission[] }>('/integrations/submissions?limit=200', {
          auth: true,
        }),
        api<{ stats: ExtractionStats }>('/integrations/stats', { auth: true }),
      ]);
      setSubmissions(s.submissions);
      setStats(st.stats);
    } catch {
      // ignore
    }
  };

  const onConnected = async (i: Integration) => {
    setIntegrations((prev) => {
      const idx = prev.findIndex((x) => x.platform === i.platform);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = i;
        return next;
      }
      return [...prev, i];
    });
    await refreshAll();
  };

  const onDisconnect = async (platform: Platform) => {
    if (
      !confirm(
        `Disconnect ${platformLabel(platform)}? All extracted submissions for this platform will be deleted.`
      )
    )
      return;
    try {
      await api(`/integrations/${platform}`, { method: 'DELETE', auth: true });
      setIntegrations((prev) => prev.filter((x) => x.platform !== platform));
      toast.success('Disconnected');
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to disconnect');
    }
  };

  const onSync = async (platform: Platform) => {
    setIntegrations((prev) =>
      prev.map((x) => (x.platform === platform ? { ...x, lastSyncStatus: 'never' as const } : x))
    );
    try {
      const r = await api<{ integration: Integration; newSubmissions: number; total: number }>(
        `/integrations/${platform}/sync`,
        { method: 'POST', auth: true }
      );
      setIntegrations((prev) =>
        prev.map((x) => (x.platform === platform ? r.integration : x))
      );
      toast.success(
        r.newSubmissions > 0
          ? `+${r.newSubmissions} new Â· ${r.total} total cached`
          : `Up to date Â· ${r.total} cached`
      );
      await refreshAll();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Sync failed';
      toast.error(msg);
      // refetch to get error state
      api<{ integrations: Integration[] }>('/integrations', { auth: true })
        .then((res) => setIntegrations(res.integrations))
        .catch(() => {});
    }
  };

  const filtered = useMemo(
    () => (filter === 'all' ? submissions : submissions.filter((s) => s.platform === filter)),
    [submissions, filter]
  );

  const connectedSet = useMemo(
    () => new Set<Platform>(integrations.map((i) => i.platform)),
    [integrations]
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-accent-rose" />
          <h2 className="mt-3 font-display text-xl font-semibold">Failed to load</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
            <Globe2 className="h-3 w-3" /> Integrations
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">Connected Platforms</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pull submissions from LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, GFG, and HackerEarth.
          </p>
          {integrations.length > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-accent-emerald/20 bg-accent-emerald/5 px-2.5 py-0.5 text-[10px] font-medium text-accent-emerald">
              <RefreshCw className="h-3 w-3" /> Auto-syncs every 6h in the background Â· click Sync to refresh now
            </p>
          )}
        </div>
        <button onClick={() => setConnectOpen(true)} className="btn-primary">
          <Plug className="h-4 w-4" /> Connect platform
        </button>
      </header>

      {/* Connected list */}
      {integrations.length === 0 ? (
        <EmptyState onConnect={() => setConnectOpen(true)} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {integrations.map((i, idx) => (
              <PlatformCard
                key={i.id}
                integration={i}
                index={idx}
                onSync={() => onSync(i.platform)}
                onDisconnect={() => onDisconnect(i.platform)}
              />
            ))}
          </div>

          <CrossPlatformWidgets platforms={integrations.map((i) => i.platform)} />

          {/* Aggregate stats */}
          {stats && stats.total > 0 && (
            <section className="glass mb-6 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">Across platforms</h2>
                  <p className="text-xs text-zinc-500">
                    Aggregated from your connected integrations.
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-accent-violet" />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    By platform
                  </div>
                  <ul className="mt-2 space-y-2">
                    {/* Show every connected integration, not just ones with
                        submissions â€” otherwise newly-linked accounts disappear
                        from this section until their first sync row lands. */}
                    {integrations.map((i) => {
                      const s = stats.byPlatform[i.platform] ?? {
                        submissions: 0,
                        accepted: 0,
                        distinctSolved: 0,
                      };
                      return (
                        <li
                          key={i.platform}
                          className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {platformLabel(i.platform as Platform)}
                            </span>
                            <span className="font-mono text-xs tabular-nums text-zinc-400">
                              {s.distinctSolved} solved
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-zinc-500">
                            {s.submissions} submissions Â· {s.accepted} accepted
                            {s.submissions === 0 && ' Â· awaiting first sync'}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Top topics
                  </div>
                  {stats.topTopics.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">No tagged submissions yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {stats.topTopics.slice(0, 8).map((t, i) => (
                        <li key={t.topic} className="grid grid-cols-[24px_1fr_28px] items-center gap-2 text-sm">
                          <span className="font-mono text-xs text-zinc-500">#{i + 1}</span>
                          <div className="min-w-0">
                            <div className="truncate text-zinc-200">{t.topic}</div>
                            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia"
                                style={{
                                  width: `${(t.count / stats.topTopics[0].count) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-right font-mono text-xs tabular-nums text-zinc-400">
                            {t.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Languages
                  </div>
                  {stats.byLanguage.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">â€”</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {stats.byLanguage.slice(0, 6).map((l) => (
                        <li
                          key={l.language}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-sm"
                        >
                          <span className="truncate text-zinc-300">{l.language}</span>
                          <span className="font-mono text-xs tabular-nums text-zinc-500">
                            {l.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Submissions feed */}
          <section className="glass overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
              <h2 className="font-display text-lg font-semibold">Recent submissions</h2>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
                <Filter className="ml-1.5 h-3 w-3 text-zinc-500" />
                <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
                  All
                </FilterBtn>
                {integrations.map((i) => (
                  <FilterBtn
                    key={i.platform}
                    active={filter === i.platform}
                    onClick={() => setFilter(i.platform)}
                  >
                    {platformLabel(i.platform)}
                  </FilterBtn>
                ))}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-500">
                No submissions for this filter.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {filtered.map((s) => (
                  <SubmissionRow key={s.id} sub={s} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ConnectPlatformDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={onConnected}
        alreadyConnected={connectedSet}
      />
    </AppShell>
  );
}

// ---------------- Cross-platform widgets ----------------------------------

interface PlatformPulse {
  platform: Platform;
  handle: string;
  rating: number | null;
  rank: string;
  submissionCount: number;
  acceptedCount: number;
  solvedCount: number;
  lastSubmission: {
    problemTitle: string;
    problemUrl: string;
    status: string;
    daysSince: number | null;
    submittedAt: string;
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

/**
 * Combined cross-platform display: latest activity per connected platform +
 * a 365-day unified heatmap that sums every platform together. Lives on the
 * Sync page so the user has a "what's been going on across everything" view
 * in the same place they manage their integrations.
 */
function CrossPlatformWidgets({ platforms }: { platforms: Platform[] }) {
  const [pulse, setPulse] = useState<PlatformPulse[] | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);

  useEffect(() => {
    if (platforms.length === 0) {
      setPulse([]);
      return;
    }
    let cancelled = false;
    api<{ platforms: PlatformPulse[] }>('/integrations/last-by-platform', { auth: true })
      .then((r) => !cancelled && setPulse(r.platforms))
      .catch(() => !cancelled && setPulse([]));
    api<HeatmapResponse>('/integrations/heatmap?days=365', { auth: true })
      .then((r) => !cancelled && setHeatmap(r))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [platforms.length]);

  if (platforms.length === 0) return null;

  return (
    <>
      {/* Per-platform pulse strip */}
      {pulse && pulse.length > 0 && (
        <section className="mb-6">
          <div className="mb-3">
            <h2 className="font-display text-base font-semibold">Latest activity per platform</h2>
            <p className="text-[11px] text-zinc-500">
              Most recent submission on each connected platform â€” click to open it on the platform.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pulse.map((p, i) => (
              <PulseCard key={p.platform} pulse={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Combined activity heatmap */}
      {heatmap && (
        <section className="glass mb-6 p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">
                Combined activity heatmap
              </h2>
              <p className="text-[11px] text-zinc-500">
                Every submission across every platform you've connected, plus internal AlgoTalk
                solves â€” last 365 days.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
              <HeatmapStat label="Active days" value={String(heatmap.activeDays)} />
              <HeatmapStat
                label="Streak"
                value={`${heatmap.currentStreak}d`}
                tint="violet"
              />
              <HeatmapStat label="Best streak" value={`${heatmap.longestStreak}d`} />
              <HeatmapStat
                label="Accepted"
                value={`${heatmap.totalAccepted}/${heatmap.totalSubmissions}`}
                tint="emerald"
              />
            </div>
          </div>
          <Heatmap days={heatmap.days} />
        </section>
      )}
    </>
  );
}

function PulseCard({ pulse, index }: { pulse: PlatformPulse; index: number }) {
  const last = pulse.lastSubmission;
  const stale = !last || (last.daysSince !== null && last.daysSince > 14);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
      className="glass flex flex-col gap-2 p-4"
    >
      <div className="flex items-center gap-3">
        <PlatformIcon platform={pulse.platform} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
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
            â­ {pulse.rating}
          </span>
        )}
        <span className="rounded-full border border-accent-emerald/20 bg-accent-emerald/10 px-2 py-0.5 text-accent-emerald">
          {pulse.solvedCount.toLocaleString()} solved
        </span>
      </div>
      {last ? (
        <a
          href={last.problemUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-sm transition hover:border-accent-violet/30"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>Last submission</span>
            <span className="text-zinc-600">Â·</span>
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
                : `${last.daysSince ?? 'â€”'} days ago`}
          </div>
        </a>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 p-2.5 text-[11px] text-zinc-500">
          No submissions pulled â€” click Sync to fetch.
        </div>
      )}
    </motion.div>
  );
}

function HeatmapStat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: 'violet' | 'emerald';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-2.5 py-1',
        tint === 'violet'
          ? 'border-accent-violet/25 bg-accent-violet/10 text-accent-violet'
          : tint === 'emerald'
            ? 'border-accent-emerald/25 bg-accent-emerald/10 text-accent-emerald'
            : 'border-white/10 bg-white/[0.03]'
      )}
    >
      <span className="font-mono text-xs font-semibold tabular-nums">{value}</span>
      <span className="ml-1.5 text-[9px] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

function Heatmap({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0) {
    return <div className="text-[11px] text-zinc-500">No activity yet.</div>;
  }
  const max = Math.max(1, ...days.map((d) => d.total));
  // Pack into 7-row weekly columns starting from the day-of-week of the first row.
  const firstDay = new Date(days[0].date + 'T00:00:00Z').getUTCDay();
  const cols: HeatmapDay[][] = [];
  let week: HeatmapDay[] = [];
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
  const intensity = (n: number) => {
    if (n === 0) return 'bg-white/[0.03] border-white/[0.04]';
    const ratio = n / max;
    if (ratio > 0.75) return 'bg-accent-violet/90 border-accent-violet';
    if (ratio > 0.5) return 'bg-accent-violet/70 border-accent-violet/70';
    if (ratio > 0.25) return 'bg-accent-violet/45 border-accent-violet/40';
    return 'bg-accent-violet/20 border-accent-violet/20';
  };
  return (
    <>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          {cols.map((wk, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {wk.map((d, di) =>
                d ? (
                  <div
                    key={di}
                    title={`${d.date}: ${d.total} submission${d.total === 1 ? '' : 's'} (${d.accepted} accepted)\n${
                      Object.entries(d.byPlatform)
                        .map(([k, v]) => `Â· ${k}: ${v}`)
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
    </>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-2.5 py-1 font-medium transition',
        active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'
      )}
    >
      {children}
    </button>
  );
}

function PlatformCard({
  integration,
  index,
  onSync,
  onDisconnect,
}: {
  integration: Integration;
  index: number;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
      className="glass p-5"
    >
      <div className="flex items-start gap-3">
        <PlatformIcon platform={integration.platform} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{platformLabel(integration.platform)}</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
              @{integration.handle}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {integration.rating !== null && (
              <span>Rating {integration.rating}</span>
            )}
            {integration.rank && <span>Â· {integration.rank}</span>}
            {integration.displayName && integration.displayName !== integration.handle && (
              <span>Â· {integration.displayName}</span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Solved" value={(integration.solvedCount ?? 0).toLocaleString()} />
            <Stat label="Syncs" value={integration.syncCount.toString()} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SyncStatus integration={integration} />
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-ghost text-xs"
            title="Manually sync (rate-limited 1/5min)"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync
          </button>
          <button
            onClick={onDisconnect}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-accent-rose/10 hover:text-accent-rose"
            title="Disconnect"
            aria-label="Disconnect"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <div className="font-display text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function SyncStatus({ integration }: { integration: Integration }) {
  const last = integration.lastSyncAt;
  if (!last) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <Clock className="h-3 w-3" /> Never synced
      </span>
    );
  }
  const ago = timeAgo(last);
  if (integration.lastSyncStatus === 'failed') {
    // Show the failure reason inline so the user knows what went wrong
    // without having to hover. Truncate to keep the card layout tight.
    const reason = (integration.lastSyncError ?? '').trim();
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[11px] text-accent-rose">
          <XCircle className="h-3 w-3 shrink-0" /> Failed Â· {ago}
        </span>
        {reason && (
          <span
            className="line-clamp-2 max-w-[300px] text-[10px] leading-snug text-accent-rose/80"
            title={reason}
          >
            {reason}
          </span>
        )}
      </div>
    );
  }
  // Synced successfully but returned 0 submissions â†’ show a softer hint so
  // the user understands "green" doesn't mean "we found data".
  if (integration.submissionCount === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[11px] text-amber-300">
          <CheckCircle2 className="h-3 w-3 shrink-0" /> Synced {ago}
        </span>
        <span className="text-[10px] leading-snug text-amber-300/80">
          0 submissions found Â· check the handle is correct
        </span>
      </div>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-accent-emerald">
      <CheckCircle2 className="h-3 w-3" /> Synced {ago}
    </span>
  );
}

function SubmissionRow({ sub }: { sub: ExtractedSubmission }) {
  const ok = sub.status === 'accepted';
  return (
    <li className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.02]">
      <PlatformIcon platform={sub.platform} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {sub.problemUrl ? (
            <a
              href={sub.problemUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate font-medium text-zinc-100 hover:text-accent-violet"
            >
              {sub.problemTitle}
              <ExternalLink className="ml-1 inline h-3 w-3 text-zinc-500" />
            </a>
          ) : (
            <span className="truncate font-medium text-zinc-100">{sub.problemTitle}</span>
          )}
          {sub.rating && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
              {sub.rating}
            </span>
          )}
          {sub.difficulty !== 'unknown' && (
            <span
              className={cn(
                'rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase',
                sub.difficulty === 'easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                sub.difficulty === 'medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                sub.difficulty === 'hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
              )}
            >
              {sub.difficulty}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
          <span className={ok ? 'text-accent-emerald' : 'text-accent-rose'}>
            {STATUS_LABEL[sub.status] ?? sub.status}
          </span>
          <span>Â·</span>
          <span className="truncate font-mono">{sub.language || 'â€”'}</span>
          {sub.topics.length > 0 && (
            <>
              <span>Â·</span>
              <span className="truncate">{sub.topics.slice(0, 3).join(', ')}</span>
            </>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[10px] text-zinc-500">{timeAgo(sub.submittedAt)}</span>
    </li>
  );
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="glass flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex gap-2">
        <PlatformIcon platform="leetcode" size="lg" />
        <PlatformIcon platform="codeforces" size="lg" />
      </div>
      <h3 className="font-display text-2xl font-bold">Sync your real-world progress</h3>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Connect a public LeetCode or Codeforces handle to pull your submissions into AlgoTalk. We
        normalize topics across platforms so your stats actually line up.
      </p>
      <button onClick={onConnect} className="btn-primary mt-6">
        <Sparkles className="h-4 w-4" /> Connect your first platform
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
