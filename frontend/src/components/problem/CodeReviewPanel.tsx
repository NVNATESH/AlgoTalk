'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface CodeReview {
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

const SEVERITY_META: Record<
  CodeReview['lineComments'][number]['severity'],
  { icon: typeof Info; tint: string; label: string }
> = {
  critical: { icon: AlertOctagon, tint: 'text-accent-rose border-accent-rose/30 bg-accent-rose/5', label: 'Critical' },
  warning: { icon: AlertTriangle, tint: 'text-amber-300 border-amber-400/30 bg-amber-400/5', label: 'Warning' },
  suggestion: { icon: Lightbulb, tint: 'text-accent-violet border-accent-violet/30 bg-accent-violet/5', label: 'Suggestion' },
  info: { icon: Info, tint: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5', label: 'Info' },
};

export function CodeReviewPanel({
  slug,
  submissionId,
  onJumpToLine,
  onCommentsChange,
}: {
  slug: string;
  submissionId: string;
  onJumpToLine?: (line: number) => void;
  onCommentsChange?: (comments: CodeReview['lineComments']) => void;
}) {
  const [review, setReview] = useState<CodeReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bubble line comments up to the parent (so it can decorate the editor).
  useEffect(() => {
    onCommentsChange?.(review?.lineComments ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review]);

  // Clear decorations when the panel unmounts (tab change, submission cleared).
  useEffect(() => {
    return () => {
      onCommentsChange?.([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExisting = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ review: CodeReview | null }>(
        `/problems/${slug}/submissions/${submissionId}/review`,
        { auth: true }
      );
      setReview(r.review);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const generate = async (force = false) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ review: CodeReview; cached: boolean }>(
        `/problems/${slug}/submissions/${submissionId}/review`,
        { method: 'POST', auth: true, body: { force } }
      );
      setReview(r.review);
      toast.success(r.cached ? 'Loaded cached review' : 'Review ready');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Review failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Auto-fetch any cached review on first mount / when submission changes
  useEffect(() => {
    setReview(null);
    setError(null);
    void fetchExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading review…
      </div>
    );
  }

  if (!review) {
    return (
      <div className="rounded-xl border border-accent-violet/20 bg-gradient-to-br from-accent-violet/10 to-accent-fuchsia/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-sm font-semibold">AI code review</h4>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Get a senior-engineer-style review of this submission — overall verdict, score, and
              line-by-line comments on what to improve.
            </p>
            <button
              onClick={() => generate(false)}
              disabled={busy}
              className="btn-primary mt-3 text-xs"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Get AI review
            </button>
            {error && <p className="mt-2 text-[11px] text-accent-rose">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <ScoreGauge score={review.score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-sm font-semibold">AI Code Review</h4>
            <button
              onClick={() => generate(true)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 disabled:opacity-50"
              title="Regenerate review"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Regenerate
            </button>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
            {review.overall}
          </p>
        </div>
      </div>

      {(review.strengths.length > 0 || review.weaknesses.length > 0) && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {review.strengths.length > 0 && (
            <BulletList
              icon={CheckCircle2}
              tint="emerald"
              title="Strengths"
              items={review.strengths}
            />
          )}
          {review.weaknesses.length > 0 && (
            <BulletList
              icon={XCircle}
              tint="amber"
              title="Weaknesses"
              items={review.weaknesses}
            />
          )}
        </div>
      )}

      {review.lineComments.length > 0 && (
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Line comments · {review.lineComments.length}
          </div>
          <ul className="space-y-1.5">
            <AnimatePresence>
              {review.lineComments.map((c, idx) => (
                <LineCommentRow
                  key={`${c.line}-${idx}`}
                  comment={c}
                  onJump={onJumpToLine ? () => onJumpToLine(c.line) : undefined}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      <div className="text-right text-[10px] text-zinc-600">
        Generated by {review.model} · {new Date(review.createdAt).toLocaleString()}
      </div>
    </motion.div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const tint =
    score >= 90
      ? 'text-accent-emerald'
      : score >= 70
        ? 'text-accent-cyan'
        : score >= 50
          ? 'text-amber-300'
          : 'text-accent-rose';
  const ring =
    score >= 90
      ? 'border-accent-emerald/40'
      : score >= 70
        ? 'border-accent-cyan/40'
        : score >= 50
          ? 'border-amber-400/40'
          : 'border-accent-rose/40';
  return (
    <div
      className={cn(
        'flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border-2 bg-bg-elevated',
        ring
      )}
    >
      <span className={cn('font-display text-xl font-bold leading-none tabular-nums', tint)}>
        {score}
      </span>
      <span className="mt-0.5 text-[8px] uppercase tracking-wider text-zinc-500">/100</span>
    </div>
  );
}

function BulletList({
  icon: Icon,
  tint,
  title,
  items,
}: {
  icon: typeof CheckCircle2;
  tint: 'emerald' | 'amber';
  title: string;
  items: string[];
}) {
  const map = {
    emerald: 'border-accent-emerald/20 text-accent-emerald',
    amber: 'border-amber-400/20 text-amber-300',
  } as const;
  return (
    <div className={cn('rounded-xl border bg-white/[0.02] p-3', map[tint])}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <ul className="space-y-1 text-xs text-zinc-300">
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
  onJump,
}: {
  comment: CodeReview['lineComments'][number];
  onJump?: () => void;
}) {
  const meta = SEVERITY_META[comment.severity];
  const Icon = meta.icon;
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('rounded-xl border p-3', meta.tint)}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onJump}
              disabled={!onJump}
              className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-100 transition hover:bg-white/20 disabled:cursor-default"
              title={onJump ? 'Jump to line' : undefined}
            >
              L{comment.line}
            </button>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">{comment.comment}</p>
        </div>
      </div>
    </motion.li>
  );
}
