'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useGoals } from '@/stores/goalStore';
import type { Goal } from '@/types/goal';
import { cn } from '@/lib/utils';

/**
 * Lightweight Gantt-style timeline showing each active goal as a horizontal
 * bar from startDate to deadline. A "today" vertical marker shows the user's
 * current position. Bar color codes based on risk: green=on track, amber=at
 * risk, rose=behind. Click a bar to deep-link into the goal.
 *
 * Spec: Module 3.9 (Interactive Gantt). The drag-to-modify-deadlines version
 * would require backend mutation + a date-picker; this read-only timeline is
 * the minimum-viable version that surfaces the same information.
 */

const STATUS_COLORS = {
  on_track: { bar: 'bg-accent-emerald/40', border: 'border-accent-emerald/50', dot: 'bg-accent-emerald' },
  at_risk: { bar: 'bg-amber-400/40', border: 'border-amber-400/50', dot: 'bg-amber-300' },
  behind: { bar: 'bg-accent-rose/40', border: 'border-accent-rose/50', dot: 'bg-accent-rose' },
} as const;

type RiskBucket = keyof typeof STATUS_COLORS;

function bucketFromGoal(g: Goal): RiskBucket {
  // Fallback heuristic if no riskScore: compare progress vs time elapsed.
  const start = new Date(g.startDate).getTime();
  const end = new Date(g.deadline).getTime();
  const now = Date.now();
  if (end <= start) return 'on_track';
  const timePct = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const progressPct = (g.progress ?? 0) / 100;
  const slack = progressPct - timePct;
  if (slack >= -0.1) return 'on_track';
  if (slack >= -0.3) return 'at_risk';
  return 'behind';
}

export function GoalTimeline({ goals }: { goals: Goal[] }) {
  const active = useMemo(
    () =>
      goals.filter(
        (g) => g.status === 'active' && g.startDate && g.deadline
      ),
    [goals]
  );

  // Compute the timeline range — earliest start to furthest deadline, padded.
  const range = useMemo(() => {
    if (active.length === 0) return null;
    const starts = active.map((g) => new Date(g.startDate).getTime());
    const ends = active.map((g) => new Date(g.deadline).getTime());
    const min = Math.min(...starts);
    const max = Math.max(...ends);
    const span = Math.max(max - min, 24 * 60 * 60 * 1000); // ≥1 day
    // Pad 5% on each side
    const pad = span * 0.05;
    return { min: min - pad, max: max + pad, span: span + 2 * pad };
  }, [active]);

  const [hover, setHover] = useState<{
    goal: Goal;
    x: number;
    y: number;
    bucket: RiskBucket;
  } | null>(null);

  // Optimistic deadline overrides during drag, keyed by goal id.
  const [draftDeadline, setDraftDeadline] = useState<Record<string, number>>({});
  const trackRef = useRef<HTMLUListElement | null>(null);
  const upsertGoal = useGoals((s) => s.upsert);

  const startDrag = (
    goal: Goal,
    e: React.PointerEvent<HTMLSpanElement>
  ) => {
    if (!range || !trackRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const track = trackRef.current.getBoundingClientRect();
    const goalStart = new Date(goal.startDate).getTime();
    let lastDeadline = new Date(goal.deadline).getTime();

    const onMove = (mv: PointerEvent) => {
      const xPct = (mv.clientX - track.left) / track.width;
      const t = Math.round(range.min + xPct * range.span);
      // Don't drag the deadline before the start.
      const minEnd = goalStart + 24 * 60 * 60 * 1000; // ≥1 day after start
      const next = Math.max(minEnd, t);
      lastDeadline = next;
      setDraftDeadline((d) => ({ ...d, [goal.id]: next }));
    };

    const onUp = async () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const newDeadline = new Date(lastDeadline);
      // No-op if the user barely moved.
      if (Math.abs(lastDeadline - new Date(goal.deadline).getTime()) < 12 * 60 * 60 * 1000) {
        setDraftDeadline((d) => {
          const { [goal.id]: _, ...rest } = d;
          return rest;
        });
        return;
      }
      try {
        const r = await api<{ goal: Goal }>(`/goals/${goal.id}/dates`, {
          method: 'PATCH',
          auth: true,
          body: { deadline: newDeadline.toISOString() },
        });
        upsertGoal(r.goal);
        toast.success(`Deadline → ${newDeadline.toLocaleDateString()}`);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not save deadline');
      } finally {
        setDraftDeadline((d) => {
          const { [goal.id]: _, ...rest } = d;
          return rest;
        });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!range || active.length === 0) {
    return (
      <div className="text-[11px] text-zinc-500">
        No active goals with deadlines yet — create a goal to see your timeline.
      </div>
    );
  }

  const todayPct = ((Date.now() - range.min) / range.span) * 100;
  // Build month tick marks across the visible window
  const ticks: Array<{ pct: number; label: string }> = [];
  const startMonth = new Date(range.min);
  startMonth.setDate(1);
  startMonth.setHours(0, 0, 0, 0);
  for (let t = startMonth.getTime(); t <= range.max; ) {
    const d = new Date(t);
    const pct = ((t - range.min) / range.span) * 100;
    if (pct >= 0 && pct <= 100) {
      ticks.push({
        pct,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
      });
    }
    d.setMonth(d.getMonth() + 1);
    t = d.getTime();
  }

  return (
    <div className="relative">
      {/* Tick row */}
      <div className="relative mb-2 h-4 border-b border-white/5">
        {ticks.map((t, i) => (
          <span
            key={i}
            className="absolute top-0 -translate-x-1/2 text-[9px] uppercase tracking-wider text-zinc-500"
            style={{ left: `${t.pct}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* Bars */}
      <ul ref={trackRef} className="relative space-y-1.5">
        {/* Today marker */}
        {todayPct >= 0 && todayPct <= 100 && (
          <span
            className="pointer-events-none absolute -top-2 bottom-0 w-px bg-accent-violet/60"
            style={{ left: `${todayPct}%` }}
          >
            <span className="absolute -left-7 -top-3 rounded-full border border-accent-violet/40 bg-bg/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent-violet">
              today
            </span>
          </span>
        )}

        {active.map((g) => {
          const start = new Date(g.startDate).getTime();
          const draftEnd = draftDeadline[g.id];
          const end = draftEnd ?? new Date(g.deadline).getTime();
          const leftPct = ((start - range.min) / range.span) * 100;
          const widthPct = ((end - start) / range.span) * 100;
          const bucket = bucketFromGoal(g);
          const meta = STATUS_COLORS[bucket];
          const progressFrac = Math.max(0, Math.min(1, (g.progress ?? 0) / 100));
          const isDragging = draftEnd !== undefined;
          return (
            <li key={g.id} className="relative h-7">
              <Link
                href={`/goals/${g.id}`}
                className="absolute top-0 flex h-full items-center"
                style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                onMouseEnter={(e) => {
                  if (isDragging) return;
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setHover({
                    goal: g,
                    x: r.left + r.width / 2,
                    y: r.top - 8,
                    bucket,
                  });
                }}
                onMouseLeave={() => setHover(null)}
                onClick={(e) => {
                  // Don't navigate while we're finishing a drag
                  if (isDragging) e.preventDefault();
                }}
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className={cn(
                    'relative flex h-5 w-full origin-left items-center overflow-hidden rounded-md border',
                    meta.bar,
                    meta.border,
                    isDragging && 'ring-2 ring-accent-violet/40'
                  )}
                >
                  {/* Progress fill */}
                  <span
                    className={cn('absolute inset-y-0 left-0 opacity-70', meta.dot)}
                    style={{ width: `${progressFrac * 100}%` }}
                  />
                  <span className="relative ml-2 truncate text-[10px] font-medium text-zinc-100">
                    {g.icon ?? '🎯'} {g.name}
                  </span>
                </motion.div>
              </Link>
              {/* Drag handle on the right edge of the bar — pointer-events sit
                  above the Link so dragging here doesn't navigate. */}
              <span
                role="slider"
                aria-label={`Drag to change ${g.name} deadline`}
                aria-valuetext={new Date(end).toLocaleDateString()}
                onPointerDown={(e) => startDrag(g, e)}
                className="absolute top-0.5 z-10 h-6 w-2 cursor-ew-resize rounded-r-md bg-white/0 hover:bg-white/30"
                style={{ left: `calc(${leftPct + Math.max(widthPct, 2)}% - 4px)` }}
              />
            </li>
          );
        })}
      </ul>

      {hover && (
        <div
          className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-bg-card/95 px-3 py-2 text-[11px] text-zinc-100 shadow-xl backdrop-blur-xl"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_COLORS[hover.bucket].dot)} />
            {hover.goal.name}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-zinc-500">
            <CalendarDays className="h-3 w-3" />
            <span>
              {new Date(hover.goal.startDate).toLocaleDateString()} →{' '}
              {new Date(hover.goal.deadline).toLocaleDateString()}
            </span>
            <span>·</span>
            <span>{hover.goal.progress ?? 0}% done</span>
          </div>
        </div>
      )}
    </div>
  );
}
