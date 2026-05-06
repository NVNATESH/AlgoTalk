'use client';

import { motion } from 'framer-motion';
import { formatTime } from '@/stores/pomodoroStore';
import { cn } from '@/lib/utils';

const GRAD_BY_MODE: Record<string, [string, string]> = {
  work: ['#8b5cf6', '#ec4899'],
  short_break: ['#10b981', '#06b6d4'],
  long_break: ['#06b6d4', '#8b5cf6'],
};

export function CircularTimer({
  remainingMs,
  totalSeconds,
  mode,
  size = 220,
  stroke = 14,
  status,
  label,
}: {
  remainingMs: number;
  totalSeconds: number;
  mode: 'work' | 'short_break' | 'long_break';
  size?: number;
  stroke?: number;
  status: 'idle' | 'running' | 'paused';
  label?: string;
}) {
  const [c1, c2] = GRAD_BY_MODE[mode];
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingMs / 1000 / Math.max(1, totalSeconds)));
  const dash = circumference * (1 - progress);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`pomo-grad-${mode}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#pomo-grad-${mode})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 0.4, ease: 'linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</span>
        )}
        <span
          className={cn(
            'font-mono text-5xl font-bold tabular-nums leading-none',
            status === 'paused' && 'opacity-60'
          )}
        >
          {formatTime(remainingMs)}
        </span>
        <span className="mt-2 text-[11px] uppercase tracking-wider text-zinc-500">
          {status === 'running' ? '● Running' : status === 'paused' ? '⏸ Paused' : 'Ready'}
        </span>
      </div>
    </div>
  );
}
