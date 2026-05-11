'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { memo, useState } from 'react';
import { Flame, Eye, PauseCircle, PlayCircle, Crosshair, Loader2, Trash2, MoreVertical, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Goal } from '@/types/goal';
import { useGoals } from '@/stores/goalStore';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const statusBadge: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30' },
  paused: { label: 'Paused', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  completed: { label: 'Completed', className: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30' },
  archived: { label: 'Archived', className: 'bg-white/5 text-zinc-500 border-white/10' },
};

function daysUntil(dateIso: string) {
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function riskState(g: Goal): { color: string; emoji: string; label: string } {
  if (g.status === 'completed') return { color: 'text-accent-violet', emoji: '🏆', label: 'Done' };
  const left = daysUntil(g.deadline);
  const expected = g.modules.length === 0 ? 0 : ((Date.now() - new Date(g.startDate).getTime()) / (new Date(g.deadline).getTime() - new Date(g.startDate).getTime())) * 100;
  const lag = expected - g.progress;
  if (left < 0) return { color: 'text-accent-rose', emoji: '🔴', label: 'Overdue' };
  if (lag > 25 || left <= 2) return { color: 'text-accent-rose', emoji: '🔴', label: 'Behind' };
  if (lag > 10) return { color: 'text-amber-300', emoji: '🟡', label: 'At risk' };
  return { color: 'text-accent-emerald', emoji: '🟢', label: 'On track' };
}

function GoalCardImpl({ goal, index = 0 }: { goal: Goal; index?: number }) {
  const { setFocus, unfocus, pause, deleteGoal } = useGoals();
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const days = daysUntil(goal.deadline);
  const risk = riskState(goal);
  const sb = statusBadge[goal.status];
  const completedModules = goal.modules.filter((m) => m.status === 'completed').length;

  const wrap = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'glass relative p-5 transition',
        goal.isFocus && 'ring-2 ring-accent-violet/60 shadow-accent-violet/20'
      )}
    >
      {goal.isFocus && (
        <div className="absolute -top-2.5 left-5 flex items-center gap-1 rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
          <Crosshair className="h-3 w-3" /> In focus
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-fuchsia/20 text-2xl">
            {goal.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold leading-tight">{goal.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <span className={cn('rounded-full border px-2 py-0.5 font-medium', sb.className)}>
                {sb.label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                {goal.priority}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                {goal.difficulty}
              </span>
              <span className={cn('flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5', risk.color)}>
                {risk.emoji} {risk.label}
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Goal options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-bg-card/95 backdrop-blur-xl shadow-xl">
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    wrap('pause', () => pause(goal.id, goal.status === 'active'));
                  }}
                >
                  {goal.status === 'paused' ? (
                    <>
                      <PlayCircle className="h-4 w-4" /> Resume
                    </>
                  ) : (
                    <>
                      <PauseCircle className="h-4 w-4" /> Pause
                    </>
                  )}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm(`Delete "${goal.name}"? This cannot be undone.`)) {
                      wrap('del', () => deleteGoal(goal.id));
                    }
                  }}
                  danger
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </MenuItem>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-zinc-400">{goal.description}</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {completedModules}/{goal.modules.length} modules
          </span>
          <span className="font-mono font-semibold tabular-nums">{goal.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goal.progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-gradient-to-r from-accent-violet to-accent-fuchsia"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat
          label="Days left"
          value={days < 0 ? `${Math.abs(days)}d over` : `${days}d`}
          danger={days >= 0 && days < 3}
        />
        <Stat label="Est. hours" value={`${goal.estimatedHours}h`} />
        <Stat label="Streak" value={goal.streak > 0 ? `🔥 ${goal.streak}` : '0'} />
      </div>

      <div className="mt-4 flex gap-2">
        {goal.status === 'completed' ? (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent-violet/30 bg-accent-violet/10 py-2.5 text-sm font-medium text-accent-violet">
            <CheckCircle2 className="h-4 w-4" /> Completed
          </div>
        ) : goal.isFocus ? (
          <button
            onClick={() => wrap('unfocus', () => unfocus(goal.id))}
            disabled={busy === 'unfocus'}
            className="btn-ghost flex-1"
          >
            {busy === 'unfocus' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Exit focus'}
          </button>
        ) : (
          <button
            onClick={() => wrap('focus', () => setFocus(goal.id))}
            disabled={busy === 'focus'}
            className="btn-primary flex-1 py-2.5"
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
        <Link href={`/goals/${goal.id}`} className="btn-ghost px-4 py-2.5">
          <Eye className="h-4 w-4" />
        </Link>
      </div>

      {goal.streak > 0 && goal.status === 'active' && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
          <Flame className="h-3 w-3" /> {goal.streak}
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] py-2">
      <div className={cn('font-display font-semibold tabular-nums', danger && 'text-accent-rose')}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5',
        danger ? 'text-accent-rose hover:bg-accent-rose/10' : 'text-zinc-200'
      )}
    >
      {children}
    </button>
  );
}

export const GoalCard = memo(GoalCardImpl);
