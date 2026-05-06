'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  Loader2,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Markdown } from '@/components/learning/Markdown';
import { Countdown } from './Countdown';
import type { Challenge } from '@/types/group';
import { cn } from '@/lib/utils';

const PLATFORM_LABEL: Record<string, string> = {
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  gfg: 'GeeksforGeeks',
  atcoder: 'AtCoder',
  hackerearth: 'HackerEarth',
  custom: 'Custom',
};

export function ChallengeCard({
  challenge,
  groupId,
  isAdmin,
  currentUserId,
  onUpdate,
  onDelete,
  onRequestMeet,
}: {
  challenge: Challenge;
  groupId: string;
  isAdmin: boolean;
  currentUserId?: string;
  onUpdate: (c: Challenge) => void;
  onDelete: (id: string) => void;
  onRequestMeet?: (c: Challenge) => void;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canDelete = isAdmin || challenge.createdBy === currentUserId;
  const canRequestMeet = !!onRequestMeet && !challenge.expired;

  const isCoding = challenge.type === 'coding';
  const respondAptitude = async (option: 'A' | 'B' | 'C' | 'D') => {
    setSubmitting(option);
    try {
      const r = await api<{ challenge: Challenge }>(
        `/groups/${groupId}/challenges/${challenge.id}/respond`,
        { method: 'POST', auth: true, body: { selectedOption: option } }
      );
      onUpdate(r.challenge);
      toast.success('Answer locked in. Reveal when timer ends.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Submit failed');
    } finally {
      setSubmitting(null);
    }
  };

  const verifyExternal = async () => {
    setSubmitting('verify');
    try {
      const r = await api<{
        verified: boolean;
        message: string;
        challenge: Challenge;
      }>(`/groups/${groupId}/challenges/${challenge.id}/verify`, {
        method: 'POST',
        auth: true,
      });
      if (r.verified) {
        toast.success(r.message);
        onUpdate(r.challenge);
      } else {
        toast.error(r.message);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Verify failed');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this challenge? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api(`/groups/${groupId}/challenges/${challenge.id}`, {
        method: 'DELETE',
        auth: true,
      });
      onDelete(challenge.id);
      toast.success('Challenge deleted');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass relative overflow-hidden p-5',
        challenge.expired && 'opacity-90',
        challenge.myResponse?.isCorrect && 'ring-1 ring-accent-emerald/40'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {isCoding ? (
              <>
                <Code2 className="h-3 w-3" /> Coding
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" /> Aptitude
              </>
            )}
            <span className="text-accent-violet">· {challenge.points} pts</span>
            {challenge.difficulty && (
              <span
                className={cn(
                  'rounded-full border px-1.5 py-0.5 text-[9px]',
                  challenge.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                  challenge.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                  challenge.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                )}
              >
                {challenge.difficulty}
              </span>
            )}
          </div>
          <h3 className="mt-1 font-display text-base font-semibold leading-tight">
            {challenge.title}
          </h3>
          {challenge.description && (
            <div className="mt-1.5 text-sm text-zinc-400">
              <Markdown>{challenge.description}</Markdown>
            </div>
          )}
          {challenge.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {challenge.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            <Clock className="h-3 w-3 text-zinc-400" />
            <Countdown to={challenge.expiresAt} />
          </div>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md p-1 text-zinc-600 transition hover:bg-accent-rose/10 hover:text-accent-rose"
              title="Delete challenge"
              aria-label="Delete"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* CODING body */}
      {isCoding && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
          {challenge.problemSlug ? (
            <div className="flex items-center justify-between gap-2">
              <div className="text-zinc-300">
                Problem:{' '}
                <Link
                  href={`/solve/${challenge.problemSlug}`}
                  className="font-medium text-accent-violet hover:text-accent-fuchsia"
                >
                  {challenge.problemSlug}
                </Link>
              </div>
              <Link
                href={`/solve/${challenge.problemSlug}`}
                className="btn-primary text-xs"
              >
                <Code2 className="h-3.5 w-3.5" /> Solve now
              </Link>
            </div>
          ) : challenge.externalUrl ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-zinc-300">
                  <span className="text-zinc-500">External:</span>{' '}
                  {PLATFORM_LABEL[challenge.externalPlatform ?? ''] ?? 'Custom'}
                  {challenge.externalProblemId && (
                    <span className="ml-1 font-mono text-[10px] text-zinc-500">
                      ({challenge.externalProblemId})
                    </span>
                  )}
                </div>
                <a
                  href={challenge.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </a>
              </div>
              {challenge.externalVerifiable && !challenge.expired && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-xs">
                  {challenge.myResponse?.isCorrect ? (
                    <span className="flex items-center gap-1 text-accent-emerald">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Solve verified · +
                      {challenge.myResponse.pointsAwarded} pts
                    </span>
                  ) : (
                    <span className="text-zinc-500">
                      Solve on the platform, then click verify — auto-detected within 6h.
                    </span>
                  )}
                  {!challenge.myResponse?.isCorrect && (
                    <button
                      onClick={() => verifyExternal()}
                      disabled={submitting === 'verify'}
                      className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-1 text-[11px] font-medium text-accent-emerald transition hover:bg-accent-emerald/20 disabled:opacity-50"
                    >
                      {submitting === 'verify' ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> I solved it · verify
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}
              {!challenge.externalVerifiable && challenge.externalPlatform && challenge.externalPlatform !== 'custom' && !challenge.expired && (
                <p className="mt-2 border-t border-white/5 pt-2 text-[10px] text-zinc-500">
                  Auto-verify isn't supported for {PLATFORM_LABEL[challenge.externalPlatform] ?? challenge.externalPlatform} yet — solves are tracked manually.
                </p>
              )}
            </>
          ) : null}

          {challenge.expired && challenge.resolved && (
            <div className="mt-3 border-t border-white/5 pt-3 text-sm">
              {challenge.myResponse?.isCorrect ? (
                <div className="flex items-center gap-2 text-accent-emerald">
                  <CheckCircle2 className="h-4 w-4" /> Solved within the window — +
                  {challenge.myResponse.pointsAwarded} pts
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-500">
                  <XCircle className="h-4 w-4" /> No accepted submission within the window.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* APTITUDE body */}
      {!isCoding && challenge.options && (
        <div className="mt-4 space-y-2">
          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
            const optText = challenge.options![letter];
            const myChoice = challenge.myResponse?.selectedOption;
            const isMine = myChoice === letter;
            const isCorrect = challenge.correctAnswer === letter;
            const showReveal = challenge.expired;
            const canClick = !challenge.expired && !challenge.myResponse;

            const cls = cn(
              'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition',
              showReveal
                ? isCorrect
                  ? 'border-accent-emerald/60 bg-accent-emerald/10 text-zinc-100'
                  : isMine
                    ? 'border-accent-rose/40 bg-accent-rose/5 text-zinc-400'
                    : 'border-white/5 bg-white/[0.02] text-zinc-500'
                : isMine
                  ? 'border-accent-violet/60 bg-accent-violet/15 text-zinc-100'
                  : canClick
                    ? 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10'
                    : 'border-white/5 bg-white/[0.02] text-zinc-500'
            );

            return (
              <button
                key={letter}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && respondAptitude(letter)}
                className={cls}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    showReveal && isCorrect
                      ? 'border-accent-emerald bg-accent-emerald text-white'
                      : isMine
                        ? 'border-accent-violet bg-accent-violet text-white'
                        : 'border-white/20 text-zinc-400'
                  )}
                >
                  {submitting === letter ? <Loader2 className="h-3 w-3 animate-spin" /> : letter}
                </span>
                <span className="flex-1">{optText}</span>
                {showReveal && isCorrect && (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent-emerald" />
                )}
                {isMine && showReveal && !isCorrect && (
                  <XCircle className="mt-0.5 h-4 w-4 text-accent-rose" />
                )}
              </button>
            );
          })}

          {/* Status line */}
          <div className="pt-1 text-xs">
            {!challenge.expired && challenge.myResponse && (
              <span className="text-accent-violet">
                Locked in: {challenge.myResponse.selectedOption} · result reveals when timer ends
              </span>
            )}
            {challenge.expired && challenge.resolved && challenge.myResponse?.isCorrect && (
              <span className="text-accent-emerald">
                ✓ Correct — earned {challenge.myResponse.pointsAwarded} pts
              </span>
            )}
            {challenge.expired && challenge.resolved && challenge.myResponse && !challenge.myResponse.isCorrect && (
              <span className="text-zinc-500">Wrong answer · no points awarded</span>
            )}
            {challenge.expired && !challenge.myResponse && (
              <span className="text-zinc-500">You didn't answer in time.</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>
          {challenge.responseCount} response{challenge.responseCount === 1 ? '' : 's'} · posted{' '}
          {new Date(challenge.createdAt).toLocaleString()}
        </span>
        {canRequestMeet && (
          <button
            onClick={() => onRequestMeet?.(challenge)}
            className="inline-flex items-center gap-1 rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2.5 py-1 text-[10px] font-medium text-accent-violet transition hover:bg-accent-violet/20"
            title="Request a pair-coding meet on this challenge"
          >
            <Users className="h-3 w-3" /> Request meet
          </button>
        )}
      </div>
    </motion.div>
  );
}
