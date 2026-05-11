'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MonthStats } from '@/types/rewind';

const COLORS = {
  Easy: '#10b981',
  Medium: '#f59e0b',
  Hard: '#f43f5e',
} as const;

export function MonthChart({ months }: { months: MonthStats[] }) {
  const max = Math.max(
    1,
    ...months.map((m) => m.byDifficulty.Easy + m.byDifficulty.Medium + m.byDifficulty.Hard)
  );

  const width = 720;
  const barAreaH = 180;
  const totalH = barAreaH + 50;
  const left = 30;
  const right = 10;
  const barW = (width - left - right) / months.length - 6;

  const [hover, setHover] = useState<{ m: MonthStats; x: number } | null>(null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${totalH}`} className="block w-full">
        {/* Y-axis ticks */}
        {[0, 0.5, 1].map((t, i) => {
          const y = barAreaH - barAreaH * t + 10;
          return (
            <g key={i}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={0} y={y + 3} fontSize="9" fill="rgba(255,255,255,0.4)">
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}

        {months.map((m, i) => {
          const x = left + i * (barW + 6);
          const total = m.byDifficulty.Easy + m.byDifficulty.Medium + m.byDifficulty.Hard;
          const totalH2 = (total / max) * barAreaH;
          let yCursor = 10 + barAreaH;

          const segments: Array<[keyof typeof COLORS, number]> = [
            ['Easy', m.byDifficulty.Easy],
            ['Medium', m.byDifficulty.Medium],
            ['Hard', m.byDifficulty.Hard],
          ];

          return (
            <g
              key={m.month}
              onMouseEnter={() => setHover({ m, x: x + barW / 2 })}
              onMouseLeave={() => setHover(null)}
            >
              {/* placeholder bar (so empty months still respond to hover) */}
              <rect
                x={x}
                y={10}
                width={barW}
                height={barAreaH}
                fill="transparent"
                className="cursor-default"
              />
              {segments.map(([k, v]) => {
                if (v === 0) return null;
                const segH = (v / max) * barAreaH;
                yCursor -= segH;
                return (
                  <motion.rect
                    key={k}
                    x={x}
                    width={barW}
                    fill={COLORS[k]}
                    rx={2}
                    initial={{ y: 10 + barAreaH, height: 0 }}
                    animate={{ y: yCursor, height: segH }}
                    transition={{ duration: 0.6, delay: Math.min(i * 0.03, 0.25), ease: [0.16, 1, 0.3, 1] }}
                  />
                );
              })}
              <text
                x={x + barW / 2}
                y={totalH - 25}
                fontSize="10"
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
              >
                {m.monthLabel}
              </text>
              {total > 0 && (
                <text
                  x={x + barW / 2}
                  y={totalH - 10}
                  fontSize="10"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.7)"
                  className="font-mono tabular-nums"
                >
                  {total}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/10 bg-bg-card/95 px-3 py-2 text-[11px] text-zinc-100 shadow-xl backdrop-blur-xl"
          style={{ left: `${(hover.x / width) * 100}%`, top: '15%' }}
        >
          <div className="font-display font-semibold">{hover.m.monthLabel}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-zinc-400">
            <span>Submissions</span>
            <span className="text-right text-zinc-100 tabular-nums">{hover.m.submissions}</span>
            <span>Distinct solved</span>
            <span className="text-right text-zinc-100 tabular-nums">{hover.m.distinctSolved}</span>
            <span>Active days</span>
            <span className="text-right text-zinc-100 tabular-nums">{hover.m.activeDays}</span>
          </div>
          {(hover.m.byDifficulty.Easy + hover.m.byDifficulty.Medium + hover.m.byDifficulty.Hard) > 0 && (
            <div className="mt-1.5 flex gap-2 text-[10px]">
              {hover.m.byDifficulty.Easy > 0 && (
                <span className="text-accent-emerald">E {hover.m.byDifficulty.Easy}</span>
              )}
              {hover.m.byDifficulty.Medium > 0 && (
                <span className="text-amber-300">M {hover.m.byDifficulty.Medium}</span>
              )}
              {hover.m.byDifficulty.Hard > 0 && (
                <span className="text-accent-rose">H {hover.m.byDifficulty.Hard}</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[10px] text-zinc-500">
        {(['Easy', 'Medium', 'Hard'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: COLORS[k] }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
