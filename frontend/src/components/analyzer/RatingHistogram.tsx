'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { RatingDistribution } from '@/types/analyzer';
import { cn } from '@/lib/utils';

// Codeforces tier colors mapped to bucket lower bound
function bucketColor(bucket: number): string {
  if (bucket < 1200) return '#9ca3af'; // gray (Newbie)
  if (bucket < 1400) return '#10b981'; // green (Pupil)
  if (bucket < 1600) return '#22d3ee'; // cyan (Specialist)
  if (bucket < 1900) return '#3b82f6'; // blue (Expert)
  if (bucket < 2100) return '#a78bfa'; // violet (Candidate Master)
  if (bucket < 2400) return '#f97316'; // orange (Master)
  return '#f43f5e'; // red (Grandmaster+)
}

function tierName(bucket: number): string {
  if (bucket < 1200) return 'Newbie';
  if (bucket < 1400) return 'Pupil';
  if (bucket < 1600) return 'Specialist';
  if (bucket < 1900) return 'Expert';
  if (bucket < 2100) return 'Candidate Master';
  if (bucket < 2400) return 'Master';
  return 'Grandmaster+';
}

export function RatingHistogram({ distribution }: { distribution: RatingDistribution }) {
  const [hover, setHover] = useState<number | null>(null);

  // Pad to a continuous range so empty buckets between min and max appear too.
  const buckets = (() => {
    if (distribution.buckets.length === 0) return [];
    const min = distribution.buckets[0].bucket;
    const max = distribution.buckets[distribution.buckets.length - 1].bucket;
    const map = new Map(distribution.buckets.map((b) => [b.bucket, b]));
    const out: typeof distribution.buckets = [];
    for (let b = min; b <= max; b += 100) {
      out.push(map.get(b) ?? { bucket: b, total: 0, accepted: 0 });
    }
    return out;
  })();

  const maxTotal = Math.max(1, ...buckets.map((b) => b.total));
  const width = 760;
  const height = 220;
  const padL = 28;
  const padR = 12;
  const padT = 14;
  const padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const barGap = 3;
  const barW = Math.max(6, innerW / buckets.length - barGap);

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-[11px]">
        <div className="text-zinc-500">
          {distribution.totalSolved} distinct problems solved across{' '}
          {distribution.totalRated} rated submissions
        </div>
        {distribution.ceiling !== null && (
          <div className="text-zinc-300">
            Hardest accepted:{' '}
            <span
              className="font-mono font-bold tabular-nums"
              style={{ color: bucketColor(Math.floor(distribution.ceiling / 100) * 100) }}
            >
              {distribution.ceiling}
            </span>{' '}
            <span className="text-zinc-500">
              · {tierName(Math.floor(distribution.ceiling / 100) * 100)}
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padT + (1 - frac) * innerH;
          const tickValue = Math.round(maxTotal * frac);
          return (
            <g key={frac}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 4}
                y={y + 3}
                fontSize="9"
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
              >
                {tickValue}
              </text>
            </g>
          );
        })}

        {buckets.map((b, i) => {
          const x = padL + i * (barW + barGap);
          const totalH = (b.total / maxTotal) * innerH;
          const acceptedH = (b.accepted / maxTotal) * innerH;
          const color = bucketColor(b.bucket);
          const isHover = hover === i;
          return (
            <g
              key={b.bucket}
              onMouseEnter={() => setHover(i)}
              className="cursor-pointer"
            >
              {/* total (faded background) */}
              <rect
                x={x}
                y={padT + innerH - totalH}
                width={barW}
                height={totalH}
                fill={color}
                fillOpacity={isHover ? 0.35 : 0.2}
                rx={2}
              />
              {/* accepted (solid foreground) */}
              <rect
                x={x}
                y={padT + innerH - acceptedH}
                width={barW}
                height={acceptedH}
                fill={color}
                rx={2}
              />
              {/* x-axis label every 200 pts to avoid overlap */}
              {b.bucket % 200 === 0 && (
                <text
                  x={x + barW / 2}
                  y={height - 18}
                  fontSize="9"
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.45)"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {b.bucket}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tier legend */}
      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500">
        {[
          [800, 'Newbie'],
          [1200, 'Pupil'],
          [1400, 'Specialist'],
          [1600, 'Expert'],
          [1900, 'CM'],
          [2100, 'Master'],
          [2400, 'GM+'],
        ].map(([bucket, name]) => (
          <span key={bucket} className="flex items-center gap-1">
            <span
              className="block h-2 w-2 rounded-sm"
              style={{ background: bucketColor(Number(bucket)) }}
            />
            {name}
          </span>
        ))}
      </div>

      {hover !== null && buckets[hover] && (
        <BucketTooltip
          bucket={buckets[hover]}
          color={bucketColor(buckets[hover].bucket)}
          tier={tierName(buckets[hover].bucket)}
        />
      )}
    </div>
  );
}

function BucketTooltip({
  bucket,
  color,
  tier,
}: {
  bucket: { bucket: number; total: number; accepted: number };
  color: string;
  tier: string;
}) {
  const acceptanceRate = bucket.total === 0 ? 0 : Math.round((bucket.accepted / bucket.total) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'pointer-events-none absolute right-3 top-3 rounded-lg border border-white/10 bg-bg-card/95 px-3 py-2 text-xs text-zinc-100 shadow-xl backdrop-blur-xl'
      )}
    >
      <div className="font-mono font-semibold tabular-nums" style={{ color }}>
        {bucket.bucket}–{bucket.bucket + 99}
        <span className="ml-2 text-[10px] font-normal text-zinc-500">{tier}</span>
      </div>
      <div className="mt-1 text-[11px]">
        <span className="font-semibold text-accent-emerald">{bucket.accepted}</span>
        <span className="text-zinc-500"> solved · </span>
        <span>{bucket.total} attempted</span>
        {bucket.total > 0 && (
          <span className="text-zinc-500"> · {acceptanceRate}%</span>
        )}
      </div>
    </motion.div>
  );
}
