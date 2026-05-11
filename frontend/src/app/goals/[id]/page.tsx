'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Crosshair,
  Loader2,
  Lightbulb,
  Lock,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { MentorButton } from '@/components/learning/MentorButton';
import { PomodoroWidget } from '@/components/pomodoro/PomodoroWidget';
import { useGoals } from '@/stores/goalStore';
import { api, ApiError } from '@/lib/api';
import type { Goal, GoalModule, ModuleStatus } from '@/types/goal';
import { cn } from '@/lib/utils';

export default function GoalFocusPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const goalId = params?.id;
  const storeGoal = useGoals((s) => (goalId ? s.getById(goalId) : undefined));
  const upsert = useGoals((s) => s.upsert);
  const setFocus = useGoals((s) => s.setFocus);
  const unfocus = useGoals((s) => s.unfocus);
  const updateModule = useGoals((s) => s.updateModule);

  const [goal, setGoal] = useState<Goal | null>(storeGoal ?? null);
  const [loading, setLoading] = useState(!storeGoal);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId) return;
    let cancelled = false;
    if (storeGoal) {
      setGoal(storeGoal);
      setLoading(false);
      return;
    }
    api<{ goal: Goal }>(`/goals/${goalId}`, { auth: true })
      .then((r) => {
        if (cancelled) return;
        setGoal(r.goal);
        upsert(r.goal);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof ApiError ? e.message : 'Failed to load goal');
        router.replace('/dashboard');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [goalId, storeGoal, upsert, router]);

  const next = useMemo(() => {
    if (!goal) return undefined;
    return (
      goal.modules.find((m) => m.status === 'in_progress') ??
      goal.modules.find((m) => m.status === 'not_started')
    );
  }, [goal]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
        </div>
      </AppShell>
    );
  }
  if (!goal) return null;

  const completed = goal.modules.filter((m) => m.status === 'completed').length;
  const inProgress = goal.modules.filter((m) => m.status === 'in_progress').length;
  const days = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000);

  const wrapAction = async (key: string, fn: () => Promise<Goal | void>) => {
    setBusy(key);
    try {
      const out = await fn();
      if (out) setGoal(out);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const cycleModule = async (m: GoalModule) => {
    const nextStatus: ModuleStatus =
      m.status === 'not_started' ? 'in_progress' : m.status === 'in_progress' ? 'completed' : 'not_started';
    await wrapAction(`m:${m.moduleId}`, async () => {
      const out = await updateModule(goal.id, m.moduleId, nextStatus);
      if (nextStatus === 'completed') toast.success(`âœ“ "${m.title}" complete`);
      return out;
    });
  };

  const openNextModule = () => {
    if (next) router.push(`/goals/${goal.id}/modules/${next.moduleId}`);
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Goals
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Hero card with progress ring */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass relative overflow-hidden p-6 lg:col-span-2"
        >
          {goal.isFocus && (
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-violet/20 blur-3xl" />
          )}
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30 text-4xl">
              {goal.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2 py-0.5 font-medium text-accent-violet">
                  {goal.difficulty}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                  {goal.priority}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 capitalize text-zinc-400">
                  {goal.status}
                </span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight md:text-4xl">
                {goal.name}
              </h1>
              <p className="mt-2 text-sm text-zinc-400">{goal.description}</p>
              {goal.rationale && (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 p-3 text-xs text-zinc-300">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-cyan" />
                  <span>
                    <span className="font-medium text-accent-cyan">Why this order: </span>
                    {goal.rationale}
                  </span>
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-3">
              <ProgressRing
                value={goal.progress}
                size={140}
                label={`${completed}/${goal.modules.length} modules`}
              />
              {goal.status === 'completed' ? (
                <span className="rounded-full bg-accent-violet/20 px-4 py-1 text-xs font-medium text-accent-violet">
                  ðŸ† Goal completed
                </span>
              ) : goal.isFocus ? (
                <button
                  onClick={() => wrapAction('focus', () => unfocus(goal.id))}
                  disabled={busy === 'focus'}
                  className="btn-ghost text-sm"
                >
                  {busy === 'focus' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Exit focus'}
                </button>
              ) : (
                <button
                  onClick={() => wrapAction('focus', () => setFocus(goal.id))}
                  disabled={busy === 'focus'}
                  className="btn-primary text-sm"
                >
                  {busy === 'focus' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Crosshair className="h-4 w-4" /> Focus
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KeyStat label="Days left" value={days < 0 ? 'Overdue' : `${days}d`} danger={days < 3} />
            <KeyStat label="Estimated" value={`${goal.estimatedHours}h`} />
            <KeyStat label="In progress" value={String(inProgress)} />
            <KeyStat label="Streak" value={goal.streak > 0 ? `ðŸ”¥ ${goal.streak}` : 'â€”'} />
          </div>
        </motion.section>

        {/* Side: AI suggestions */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-accent-violet">
            <Sparkles className="h-3.5 w-3.5" /> AI Learning Assistant
          </div>
          <h3 className="mt-1 font-display text-lg font-semibold">What's next</h3>

          {next ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-zinc-500">Recommended module</div>
              <div className="mt-1 font-display font-semibold">{next.title}</div>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{next.description}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="h-3 w-3" /> {next.estimatedHours}h Â· {next.difficulty}
              </div>
              <button
                onClick={openNextModule}
                className="btn-primary mt-3 w-full text-sm"
              >
                <PlayCircle className="h-4 w-4" /> Open module
              </button>
              <button
                onClick={() => cycleModule(next)}
                disabled={busy === `m:${next.moduleId}`}
                className="btn-ghost mt-2 w-full text-xs"
              >
                {busy === `m:${next.moduleId}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : next.status === 'not_started' ? (
                  'Mark in progress'
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-accent-violet/30 bg-accent-violet/5 p-4 text-sm text-accent-violet">
              ðŸŽ‰ You've completed every module â€” amazing work.
            </div>
          )}

          <div className="mt-5 rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-500">
            Quizzes, AI mentor chat, Pomodoro and concept generation are coming in the next slice.
          </div>
        </motion.aside>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-xl font-semibold">Modules</h2>
        <div className="space-y-2">
          {goal.modules.map((m, i) => {
            // A module is locked if any previous module is not completed
            const isLocked = i > 0 && goal.modules[i - 1].status !== 'completed';
            return (
              <ModuleRow
                key={m.moduleId}
                goalId={goal.id}
                module={m}
                index={i}
                busy={busy === `m:${m.moduleId}`}
                onCycle={() => cycleModule(m)}
                isLocked={isLocked}
              />
            );
          })}
        </div>
      </section>

      <MentorButton goalId={goal.id} goalName={goal.name} goalIcon={goal.icon} />
      <PomodoroWidget goalId={goal.id} goalName={goal.name} goalIcon={goal.icon} />
    </AppShell>
  );
}

function KeyStat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className={cn('font-display text-lg font-semibold tabular-nums', danger && 'text-accent-rose')}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function ModuleRow({
  goalId,
  module: m,
  index,
  busy,
  onCycle,
  isLocked,
}: {
  goalId: string;
  module: GoalModule;
  index: number;
  busy: boolean;
  onCycle: () => void;
  isLocked: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
      className={cn(
        'glass group flex items-start gap-4 p-4 transition hover:border-white/20',
        m.status === 'completed' && 'opacity-60',
        isLocked && m.status === 'not_started' && 'opacity-50'
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isLocked && m.status === 'not_started') {
            toast.error('Complete the previous module first');
            return;
          }
          onCycle();
        }}
        disabled={busy}
        className="mt-0.5 shrink-0"
        aria-label={
          isLocked && m.status === 'not_started'
            ? 'Locked — complete previous module'
            : m.status === 'completed' ? 'Mark not started' : m.status === 'in_progress' ? 'Mark complete' : 'Start'
        }
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
        ) : isLocked && m.status === 'not_started' ? (
          <Lock className="h-6 w-6 text-zinc-600" />
        ) : m.status === 'completed' ? (
          <CheckCircle2 className="h-6 w-6 text-accent-emerald" />
        ) : m.status === 'in_progress' ? (
          <PlayCircle className="h-6 w-6 text-accent-violet" />
        ) : (
          <Circle className="h-6 w-6 text-zinc-600 transition group-hover:text-zinc-400" />
        )}
      </button>
      <Link
        href={`/goals/${goalId}/modules/${m.moduleId}`}
        className="-m-1 min-w-0 flex-1 rounded-lg p-1 hover:bg-white/[0.02]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h4 className={cn('font-display font-semibold', m.status === 'completed' && 'line-through')}>
            {m.title}
          </h4>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
              m.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
              m.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
              m.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
            )}
          >
            {m.difficulty}
          </span>
          {m.quizScore !== null && (
            <span className="rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2 py-0.5 text-[10px] font-medium text-accent-violet">
              Quiz: {m.quizScore}%
            </span>
          )}
          {(m.problemSlugs?.length ?? 0) > 0 && (
            <span className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
              m.problemsSolved >= m.problemSlugs.length
                ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
                : 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan'
            )}>
              Problems: {m.problemsSolved}/{m.problemSlugs.length}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">{m.description}</p>
        {m.topics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {m.topics.slice(0, 6).map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </Link>
      <div className="hidden shrink-0 text-right text-xs text-zinc-500 md:block">
        <div className="flex items-center justify-end gap-1 font-mono tabular-nums">
          <Clock className="h-3 w-3" /> {m.estimatedHours}h
        </div>
        {m.dueDate && (
          <div className="mt-1 text-[10px]">due {new Date(m.dueDate).toLocaleDateString()}</div>
        )}
      </div>
    </motion.div>
  );
}
