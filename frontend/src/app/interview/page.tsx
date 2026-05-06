'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  Mic,
  Plus,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { StartInterviewDialog } from '@/components/interview/StartInterviewDialog';
import { api, ApiError } from '@/lib/api';
import type { InterviewSessionSummary } from '@/types/interview';
import { cn } from '@/lib/utils';

export default function InterviewListPage() {
  const [sessions, setSessions] = useState<InterviewSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ sessions: InterviewSessionSummary[] }>('/interview', { auth: true })
      .then((r) => !cancelled && setSessions(r.sessions))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
            <Mic className="h-3 w-3" /> AI Interview
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">🎤 Mock Interviews</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Speak your approach, write on a plain whiteboard, get a real interviewer's feedback.
          </p>
        </div>
        <button onClick={() => setStartOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Start interview
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-36 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass p-6">
          <div className="flex items-start gap-2 text-sm text-accent-rose">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState onStart={() => setStartOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s, i) => (
            <SessionCard key={s.id} session={s} index={i} />
          ))}
        </div>
      )}

      <StartInterviewDialog open={startOpen} onClose={() => setStartOpen(false)} />
    </AppShell>
  );
}

function SessionCard({ session, index }: { session: InterviewSessionSummary; index: number }) {
  const verdict = session.evaluationVerdict;
  const score = session.evaluationScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        href={`/interview/${session.id}`}
        className="glass block p-5 transition hover:border-white/20"
      >
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 font-medium',
              session.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
              session.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
              session.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
            )}
          >
            {session.difficulty}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
            {session.role}
          </span>
          <StatusPill status={session.status} />
        </div>

        <h3 className="mt-3 line-clamp-2 font-display text-base font-semibold leading-snug">
          {session.problemTitle}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">Topic: {session.topic}</p>

        <div className="mt-4 flex items-center justify-between">
          {verdict ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium',
                verdict === 'pass' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                verdict === 'partial' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                verdict === 'fail' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
              )}
            >
              {verdict.toUpperCase()}
              <span className="font-mono tabular-nums text-zinc-200/90">{score}/100</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">No evaluation yet</span>
          )}
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            {timeAgo(session.startedAt ?? session.createdAt ?? '')}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'in_progress'
      ? 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet'
      : status === 'submitted' || status === 'completed'
        ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
        : 'border-white/10 bg-white/5 text-zinc-500';
  const label =
    status === 'in_progress' ? 'In progress' : status === 'submitted' ? 'Submitted' : status;
  return (
    <span className={cn('rounded-full border px-2 py-0.5 font-medium capitalize', cls)}>
      {label}
    </span>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="glass flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
        <Mic className="h-7 w-7 text-accent-violet" />
      </div>
      <h3 className="font-display text-2xl font-bold">Practice a real interview</h3>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Pick a topic, speak your approach out loud, write code on a plain whiteboard, and get
        verdict-grade feedback from Gemini playing the interviewer.
      </p>
      <button onClick={onStart} className="btn-primary mt-6">
        <Sparkles className="h-4 w-4" /> Start your first interview
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return '';
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
