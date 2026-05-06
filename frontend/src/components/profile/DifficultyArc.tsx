'use client';

import { motion } from 'framer-motion';

interface ArcInput {
  Easy: { solved: number; total: number };
  Medium: { solved: number; total: number };
  Hard: { solved: number; total: number };
}

const COLORS = {
  Easy: '#10b981',
  Medium: '#f59e0b',
  Hard: '#f43f5e',
} as const;

export function DifficultyArc({
  data,
  size = 200,
  stroke = 14,
}: {
  data: ArcInput;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalSolved = data.Easy.solved + data.Medium.solved + data.Hard.solved;
  const totalProblems = data.Easy.total + data.Medium.total + data.Hard.total;

  // Each segment occupies 1/3 of the circle (so its length is the same regardless of count)
  const segmentArc = circumference / 3;
  const gap = 4;

  const fractions = [
    {
      label: 'Easy' as const,
      solved: data.Easy.solved,
      total: data.Easy.total,
    },
    {
      label: 'Medium' as const,
      solved: data.Medium.solved,
      total: data.Medium.total,
    },
    {
      label: 'Hard' as const,
      solved: data.Hard.solved,
      total: data.Hard.total,
    },
  ];

  return (
    <div className="flex items-center gap-5">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {fractions.map((f, i) => {
            const ratio = f.total === 0 ? 0 : Math.min(f.solved / f.total, 1);
            const segLen = Math.max(0, segmentArc - gap);
            const offset = -i * segmentArc;
            const dashFilled = segLen * ratio;
            return (
              <g key={f.label}>
                {/* track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={stroke}
                  strokeDasharray={`${segLen} ${circumference - segLen}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
                <motion.circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={COLORS[f.label]}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray: `${dashFilled} ${circumference - dashFilled}` }}
                  transition={{ duration: 0.9, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ strokeDashoffset: offset }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold tabular-nums">{totalSolved}</span>
          <span className="text-xs text-zinc-500">/ {totalProblems} solved</span>
        </div>
      </div>

      <ul className="space-y-2">
        {fractions.map((f) => {
          const pct = f.total === 0 ? 0 : Math.round((f.solved / f.total) * 100);
          return (
            <li key={f.label} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLORS[f.label] }}
              />
              <span className="font-medium" style={{ color: COLORS[f.label] }}>
                {f.label}
              </span>
              <span className="font-mono tabular-nums text-zinc-300">
                {f.solved}/{f.total}
              </span>
              <span className="text-xs text-zinc-500">({pct}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
