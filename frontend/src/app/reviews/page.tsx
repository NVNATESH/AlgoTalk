'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Info,
  Lightbulb,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ReviewListItem {
  id: string;
  submissionId: string;
  score: number;
  language: string;
  createdAt: string;
  severityCounts: {
    critical: number;
    warning: number;
    suggestion: number;
    info: number;
  };
  commentCount: number;
  problem: { slug: string; title: string; difficulty: string } | null;
  submission: { status: string } | null;
}

interface UnreviewedSubmission {
  submissionId: string;
  problem: { slug: string; title: string; difficulty: string };
  status: string;
  language: string;
  createdAt: string;
}

type ScoreBand = 'all' | '90+' | '70-89' | '50-69' | '<50';

interface ReviewDetail {
  id: string;
  submissionId: string;
  overall: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  lineComments: Array<{
    line: number;
    severity: 'critical' | 'warning' | 'suggestion' | 'info';
    comment: string;
  }>;
  language: string;
  model: string;
  createdAt: string;
}

const LANG_LABEL: Record<string, string> = {
  python: 'Python',
  javascript: 'JS',
  java: 'Java',
  cpp: 'C++',
};

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  tle: 'TLE',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
  mle: 'MLE',
};

const SEVERITY_META: Record<
  ReviewDetail['lineComments'][number]['severity'],
  { icon: typeof Info; label: string; tint: string }
> = {
  critical: { icon: AlertOctagon, label: 'Critical', tint: 'text-accent-rose' },
  warning: { icon: AlertTriangle, label: 'Warning', tint: 'text-amber-300' },
  suggestion: { icon: Lightbulb, label: 'Suggestion', tint: 'text-accent-violet' },
  info: { icon: Info, label: 'Info', tint: 'text-accent-cyan' },
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewListItem[] | null>(null);
  const [unreviewed, setUnreviewed] = useState<UnreviewedSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<string>('all');
  const [scoreBand, setScoreBand] = useState<ScoreBand>('all');

  const load = async () => {
    setError(null);
    try {
      const [r, u] = await Promise.all([
        api<{ reviews: ReviewListItem[] }>('/code-reviews', { auth: true }),
        api<{ submissions: UnreviewedSubmission[] }>('/code-reviews/unreviewed', {
          auth: true,
        }).catch(() => ({ submissions: [] })),
      ]);
      setReviews(r.reviews);
      setUnreviewed(u.submissions);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load reviews');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Distinct languages across the reviewed set, for the dropdown
  const languages = useMemo(() => {
    if (!reviews) return [] as string[];
    return Array.from(new Set(reviews.map((r) => r.language))).sort();
  }, [reviews]);

  const filtered = useMemo(() => {
    if (!reviews) return [];
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (q) {
        const hay = `${r.problem?.title ?? ''} ${r.problem?.slug ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (language !== 'all' && r.language !== language) return false;
      if (scoreBand !== 'all') {
        const s = r.score;
        if (scoreBand === '90+' && s < 90) return false;
        if (scoreBand === '70-89' && (s < 70 || s >= 90)) return false;
        if (scoreBand === '50-69' && (s < 50 || s >= 70)) return false;
        if (scoreBand === '<50' && s >= 50) return false;
      }
      return true;
    });
  }, [reviews, search, language, scoreBand]);

  if (reviews === null) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          {error ? (
            <div className="glass max-w-md p-6 text-center">
              <p className="text-sm text-accent-rose">{error}</p>
              <button onClick={load} className="btn-primary mt-4">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
          )}
        </div>
      </AppShell>
    );
  }

  const hasFilters = search !== '' || language !== 'all' || scoreBand !== 'all';

  return (
    <AppShell>
      <Header reviews={reviews} />

      {unreviewed.length > 0 && (
        <BatchReviewBar
          unreviewed={unreviewed}
          onDone={() => void load()}
        />
      )}

      {reviews.length > 0 && (
        <>
          <ScoreChart reviews={reviews} />
          <Filters
            search={search}
            setSearch={setSearch}
            language={language}
            setLanguage={setLanguage}
            languages={languages}
            scoreBand={scoreBand}
            setScoreBand={setScoreBand}
            hasFilters={hasFilters}
            onClear={() => {
              setSearch('');
              setLanguage('all');
              setScoreBand('all');
            }}
            visible={filtered.length}
            total={reviews.length}
          />
        </>
      )}

      {reviews.length > 0 ? (
        filtered.length > 0 ? (
          <ReviewTable reviews={filtered} />
        ) : (
          <div className="glass mt-3 p-8 text-center text-sm text-zinc-500">
            No reviews match these filters.
          </div>
        )
      ) : (
        <EmptyState />
      )}
    </AppShell>
  );
}

function Filters({
  search,
  setSearch,
  language,
  setLanguage,
  languages,
  scoreBand,
  setScoreBand,
  hasFilters,
  onClear,
  visible,
  total,
}: {
  search: string;
  setSearch: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  languages: string[];
  scoreBand: ScoreBand;
  setScoreBand: (v: ScoreBand) => void;
  hasFilters: boolean;
  onClear: () => void;
  visible: number;
  total: number;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by problem..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-8 text-sm text-zinc-100 outline-none transition focus:border-accent-violet/40"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 hover:text-zinc-200"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {languages.length > 1 && (
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-accent-violet/40"
        >
          <option value="all">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      )}
      <div className="flex items-center rounded-xl border border-white/10 p-0.5">
        {(['all', '90+', '70-89', '50-69', '<50'] as ScoreBand[]).map((b) => (
          <button
            key={b}
            onClick={() => setScoreBand(b)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-[11px] font-medium transition',
              scoreBand === b
                ? 'bg-white/10 text-white'
                : 'text-zinc-400 hover:text-zinc-100'
            )}
          >
            {b === 'all' ? 'Any score' : b}
          </button>
        ))}
      </div>
      {hasFilters && (
        <button
          onClick={onClear}
          className="rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-100"
        >
          Clear filters
        </button>
      )}
      <span className="ml-auto text-[11px] text-zinc-500">
        {visible} of {total}
      </span>
    </div>
  );
}

function BatchReviewBar({
  unreviewed,
  onDone,
}: {
  unreviewed: UnreviewedSubmission[];
  onDone: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [errors, setErrors] = useState<string[]>([]);

  const runBatch = async () => {
    if (running) return;
    setRunning(true);
    setErrors([]);
    setProgress({ done: 0, total: unreviewed.length, current: '' });
    let done = 0;
    const failedTitles: string[] = [];
    for (const u of unreviewed) {
      setProgress({ done, total: unreviewed.length, current: u.problem.title });
      try {
        await api(
          `/problems/${u.problem.slug}/submissions/${u.submissionId}/review`,
          { method: 'POST', auth: true, body: {} }
        );
      } catch (e) {
        failedTitles.push(u.problem.title);
      }
      done++;
      setProgress({ done, total: unreviewed.length, current: u.problem.title });
      // Tiny pause so the AI rate limiter doesn't trip and the UI can breathe.
      await new Promise((r) => setTimeout(r, 400));
    }
    setRunning(false);
    if (failedTitles.length > 0) {
      setErrors(failedTitles);
      toast.error(`${failedTitles.length} review(s) failed`);
    } else {
      toast.success(`Reviewed ${done} submission${done === 1 ? '' : 's'}`);
    }
    onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-2xl border border-accent-violet/30 bg-gradient-to-br from-accent-violet/10 to-accent-fuchsia/5 p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
          <Wand2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          {!running ? (
            <>
              <p className="text-sm font-medium text-zinc-100">
                {unreviewed.length} problem{unreviewed.length === 1 ? '' : 's'} ready to review
              </p>
              <p className="text-[11px] text-zinc-500">
                Run the AI reviewer over your latest unreviewed submission for each. ~{Math.ceil(unreviewed.length * 4)}s total.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-100">
                Reviewing {progress.done + 1} / {progress.total}
                {progress.current && (
                  <span className="ml-1 text-zinc-500">· {progress.current}</span>
                )}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-accent-violet to-accent-fuchsia transition-all"
                  style={{
                    width: `${(progress.done / Math.max(1, progress.total)) * 100}%`,
                  }}
                />
              </div>
            </>
          )}
        </div>
        <button
          onClick={runBatch}
          disabled={running}
          className="btn-primary shrink-0 text-xs"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          {running ? 'Reviewing…' : `Review all ${unreviewed.length}`}
        </button>
      </div>
      {errors.length > 0 && (
        <p className="mt-2 text-[11px] text-accent-rose">
          Failed: {errors.slice(0, 3).join(', ')}
          {errors.length > 3 && ` (+${errors.length - 3} more)`}
        </p>
      )}
    </motion.div>
  );
}

function Header({ reviews }: { reviews: ReviewListItem[] }) {
  const avg =
    reviews.length === 0
      ? 0
      : Math.round(reviews.reduce((s, r) => s + r.score, 0) / reviews.length);
  const best = reviews.reduce((m, r) => Math.max(m, r.score), 0);
  const totalCritical = reviews.reduce((s, r) => s + r.severityCounts.critical, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent-violet" />
        <h1 className="font-display text-3xl font-bold">AI Code Reviews</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        Every submission you've asked the reviewer about, with the score arc and what to fix.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Reviews" value={String(reviews.length)} tint="violet" />
        <Stat label="Avg score" value={String(avg)} sub="/100" tint="cyan" />
        <Stat label="Best score" value={String(best)} sub="/100" tint="emerald" />
        <Stat
          label="Critical issues"
          value={String(totalCritical)}
          tint={totalCritical > 0 ? 'rose' : 'zinc'}
        />
      </div>
    </motion.div>
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
  tint: 'violet' | 'cyan' | 'emerald' | 'rose' | 'zinc';
}) {
  const map = {
    violet: 'text-accent-violet',
    cyan: 'text-accent-cyan',
    emerald: 'text-accent-emerald',
    rose: 'text-accent-rose',
    zinc: 'text-zinc-300',
  } as const;
  return (
    <div className="glass p-4">
      <div className={cn('font-display text-2xl font-bold tabular-nums', map[tint])}>
        {value}
        {sub && <span className="ml-1 text-xs text-zinc-500">{sub}</span>}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function ScoreChart({ reviews }: { reviews: ReviewListItem[] }) {
  // Order chronologically (oldest left → newest right) for the trend
  const ordered = useMemo(
    () => [...reviews].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [reviews]
  );
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);

  if (ordered.length < 2) return null;

  const width = 760;
  const height = 200;
  const padL = 32;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const xFor = (i: number) =>
    padL + (ordered.length === 1 ? innerW / 2 : (i / (ordered.length - 1)) * innerW);
  const yFor = (score: number) => padT + (1 - score / 100) * innerH;

  const points = ordered.map((r, i) => `${xFor(i)},${yFor(r.score)}`).join(' ');
  const areaPath =
    `M${xFor(0)},${padT + innerH} ` +
    ordered.map((r, i) => `L${xFor(i)},${yFor(r.score)}`).join(' ') +
    ` L${xFor(ordered.length - 1)},${padT + innerH} Z`;

  return (
    <section className="glass mb-6 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-base font-semibold">Score over time</h2>
        <span className="text-[11px] text-zinc-500">
          {ordered.length} reviews · oldest → newest
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block w-full"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="scoreGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={padL}
                x2={width - padR}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 6}
                y={yFor(tick) + 3}
                fontSize="9"
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
              >
                {tick}
              </text>
            </g>
          ))}
          <path d={areaPath} fill="url(#scoreGrad)" />
          <polyline
            points={points}
            fill="none"
            stroke="#a78bfa"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {ordered.map((r, i) => (
            <circle
              key={r.id}
              cx={xFor(i)}
              cy={yFor(r.score)}
              r={hover?.idx === i ? 5 : 3}
              fill={dotColor(r.score)}
              stroke="#1a1a26"
              strokeWidth={1.5}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHover({ idx: i, x: xFor(i), y: yFor(r.score) })}
            />
          ))}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/10 bg-bg-card/95 px-2.5 py-1.5 text-[11px] text-zinc-100 shadow-xl backdrop-blur-xl"
            style={{
              left: `${(hover.x / width) * 100}%`,
              top: `${(hover.y / height) * 100}%`,
              marginTop: -10,
            }}
          >
            <div className="font-medium">
              {ordered[hover.idx].problem?.title ?? '(deleted problem)'}{' '}
              <span className="text-accent-violet">· {ordered[hover.idx].score}/100</span>
            </div>
            <div className="text-[10px] text-zinc-500">
              {new Date(ordered[hover.idx].createdAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function dotColor(score: number) {
  if (score >= 90) return '#10b981'; // emerald
  if (score >= 70) return '#22d3ee'; // cyan
  if (score >= 50) return '#fbbf24'; // amber
  return '#f43f5e'; // rose
}

function ReviewTable({ reviews }: { reviews: ReviewListItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="glass overflow-hidden">
      <div className="border-b border-white/5 px-5 py-3">
        <h2 className="font-display text-base font-semibold">All reviews</h2>
      </div>
      <ul className="divide-y divide-white/5">
        {reviews.map((r) => (
          <ReviewRow
            key={r.id}
            review={r}
            expanded={expanded === r.id}
            onToggle={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
          />
        ))}
      </ul>
    </section>
  );
}

function ReviewRow({
  review,
  expanded,
  onToggle,
}: {
  review: ReviewListItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded || detail) return;
    setLoading(true);
    api<{ review: ReviewDetail }>(`/code-reviews/${review.id}`, { auth: true })
      .then((r) => setDetail(r.review))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expanded, review.id, detail]);

  const sev = review.severityCounts;

  return (
    <li>
      <button
        onClick={onToggle}
        className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-5 py-3 text-left transition hover:bg-white/[0.02]"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate text-sm font-medium text-zinc-100">
            {review.problem ? (
              <span className="truncate">{review.problem.title}</span>
            ) : (
              <span className="text-zinc-500">(deleted problem)</span>
            )}
            {review.problem && <DifficultyChip difficulty={review.problem.difficulty} />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
            <span>{LANG_LABEL[review.language] ?? review.language}</span>
            <span>·</span>
            <span>{review.submission ? STATUS_LABEL[review.submission.status] ?? review.submission.status : 'Submission deleted'}</span>
            <span>·</span>
            <span>{timeAgo(review.createdAt)}</span>
          </div>
        </div>
        <SeverityBadges counts={sev} />
        <div className={cn('font-display text-lg font-bold tabular-nums', scoreTint(review.score))}>
          {review.score}
        </div>
        {review.problem && (
          <Link
            href={`/solve/${review.problem.slug}`}
            className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-accent-violet"
            title="Open in solve"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-white/5 bg-white/[0.02] px-5 py-4">
              {loading && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              )}
              {detail && (
                <>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
                    {detail.overall}
                  </p>
                  {(detail.strengths.length > 0 || detail.weaknesses.length > 0) && (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {detail.strengths.length > 0 && (
                        <BulletList title="Strengths" tint="emerald" items={detail.strengths} />
                      )}
                      {detail.weaknesses.length > 0 && (
                        <BulletList title="Weaknesses" tint="amber" items={detail.weaknesses} />
                      )}
                    </div>
                  )}
                  {detail.lineComments.length > 0 && (
                    <ul className="space-y-1.5">
                      {detail.lineComments.map((c, i) => (
                        <LineCommentRow key={i} comment={c} />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function SeverityBadges({
  counts,
}: {
  counts: ReviewListItem['severityCounts'];
}) {
  const items: Array<{ key: keyof typeof counts; tint: string; label: string }> = [
    { key: 'critical', tint: 'bg-accent-rose/15 text-accent-rose', label: 'C' },
    { key: 'warning', tint: 'bg-amber-400/15 text-amber-300', label: 'W' },
    { key: 'suggestion', tint: 'bg-accent-violet/15 text-accent-violet', label: 'S' },
    { key: 'info', tint: 'bg-accent-cyan/15 text-accent-cyan', label: 'I' },
  ];
  const visible = items.filter((it) => counts[it.key] > 0);
  if (visible.length === 0) {
    return <span className="text-[10px] text-zinc-600">no comments</span>;
  }
  return (
    <div className="flex items-center gap-1">
      {visible.map((it) => (
        <span
          key={it.key}
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 font-mono text-[10px] font-bold',
            it.tint
          )}
          title={`${counts[it.key]} ${it.key}`}
        >
          {counts[it.key]}
          {it.label}
        </span>
      ))}
    </div>
  );
}

function BulletList({
  title,
  tint,
  items,
}: {
  title: string;
  tint: 'emerald' | 'amber';
  items: string[];
}) {
  const map = {
    emerald: 'border-accent-emerald/20 text-accent-emerald',
    amber: 'border-amber-400/20 text-amber-300',
  } as const;
  return (
    <div className={cn('rounded-xl border bg-white/[0.02] p-2.5', map[tint])}>
      <div className="text-[10px] font-semibold uppercase tracking-wider">{title}</div>
      <ul className="mt-1 space-y-0.5 text-xs text-zinc-300">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-zinc-600">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LineCommentRow({
  comment,
}: {
  comment: ReviewDetail['lineComments'][number];
}) {
  const meta = SEVERITY_META[comment.severity];
  const Icon = meta.icon;
  return (
    <li className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
      <div className="flex items-start gap-2">
        <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', meta.tint)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-100">
              L{comment.line}
            </span>
            <span className={cn('text-[9px] font-bold uppercase tracking-wider', meta.tint)}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">{comment.comment}</p>
        </div>
      </div>
    </li>
  );
}

function DifficultyChip({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={cn(
        'rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase',
        difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
        difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
      )}
    >
      {difficulty}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="glass mt-4 p-10 text-center">
      <Sparkles className="mx-auto h-10 w-10 text-accent-violet/60" />
      <h2 className="mt-3 font-display text-xl font-semibold">No reviews yet</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Submit code on a problem and click <span className="text-accent-violet">Get AI review</span>.
      </p>
      <Link href="/problems" className="btn-primary mt-5 inline-flex">
        Browse problems
      </Link>
    </div>
  );
}

function scoreTint(score: number) {
  if (score >= 90) return 'text-accent-emerald';
  if (score >= 70) return 'text-accent-cyan';
  if (score >= 50) return 'text-amber-300';
  return 'text-accent-rose';
}

function timeAgo(iso: string) {
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
