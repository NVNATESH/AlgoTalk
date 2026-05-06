'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ActivityCell } from '@/types/profile';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

interface Cell extends ActivityCell {
  weekIdx: number;
  dayOfWeek: number; // 0 = Sun
}

const colorFor = (count: number) => {
  if (count === 0) return 'rgba(255,255,255,0.05)';
  if (count <= 1) return '#0ea372'; // emerald-700-ish
  if (count <= 3) return '#10b981';
  if (count <= 6) return '#34d399';
  return '#6ee7b7';
};

export function ActivityHeatmap({ calendar }: { calendar: ActivityCell[] }) {
  const [hover, setHover] = useState<{ cell: Cell; x: number; y: number } | null>(null);

  const { weeks, monthLabels } = useMemo(() => buildGrid(calendar), [calendar]);

  if (calendar.length === 0) return null;

  const cellSize = 11;
  const gap = 2;
  const totalWidth = weeks.length * (cellSize + gap) + 30;
  const totalHeight = 7 * (cellSize + gap) + 22;

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-2">
        <svg
          width={totalWidth}
          height={totalHeight}
          className="block"
          onMouseLeave={() => setHover(null)}
        >
          {/* Month labels */}
          {monthLabels.map((m) => (
            <text
              key={`${m.month}-${m.weekIdx}`}
              x={30 + m.weekIdx * (cellSize + gap)}
              y={10}
              fontSize="10"
              fill="rgba(255,255,255,0.5)"
            >
              {MONTHS[m.month]}
            </text>
          ))}

          {/* Day labels (left) */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={i}
                x={0}
                y={20 + i * (cellSize + gap) + cellSize - 1}
                fontSize="9"
                fill="rgba(255,255,255,0.4)"
              >
                {label}
              </text>
            ) : null
          )}

          {/* Cells */}
          {weeks.map((week, w) =>
            week.map((cell) => {
              if (!cell) return null;
              return (
                <rect
                  key={cell.date}
                  x={30 + w * (cellSize + gap)}
                  y={20 + cell.dayOfWeek * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={colorFor(cell.count)}
                  className="cursor-pointer transition-all hover:stroke-white/40"
                  strokeWidth={1}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement)?.getBoundingClientRect();
                    setHover({
                      cell,
                      x: 30 + w * (cellSize + gap) + cellSize / 2,
                      y: 20 + cell.dayOfWeek * (cellSize + gap) - 6,
                    });
                  }}
                />
              );
            })
          )}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-zinc-500">
        <span>Less</span>
        {[0, 1, 3, 6, 10].map((c) => (
          <span
            key={c}
            className="block h-2.5 w-2.5 rounded-sm"
            style={{ background: colorFor(c) }}
          />
        ))}
        <span>More</span>
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/10 bg-bg-card/95 px-2.5 py-1.5 text-[11px] text-zinc-100 shadow-xl backdrop-blur-xl"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="font-medium">
            {hover.cell.count === 0
              ? 'No activity'
              : `${hover.cell.count} submission${hover.cell.count === 1 ? '' : 's'}`}
            {hover.cell.accepted > 0 && (
              <span className="ml-1 text-accent-emerald">· {hover.cell.accepted} solved</span>
            )}
          </div>
          {hover.cell.external > 0 && (
            <div className="text-[10px] text-accent-cyan">
              {hover.cell.external} synced from external
              {hover.cell.externalAccepted > 0 && ` · ${hover.cell.externalAccepted} accepted`}
            </div>
          )}
          <div className="text-[10px] text-zinc-500">{formatDate(hover.cell.date)}</div>
        </div>
      )}
    </div>
  );
}

function buildGrid(calendar: ActivityCell[]) {
  if (calendar.length === 0) return { weeks: [], monthLabels: [] };

  // Walk forward; first cell's day-of-week determines starting offset
  const firstDate = new Date(calendar[0].date + 'T00:00:00');
  const startDow = firstDate.getDay(); // 0 (Sun) ... 6

  const weeks: Array<Array<(Cell | null)>> = [];
  let currentWeek: Array<Cell | null> = new Array(startDow).fill(null);

  let lastMonth = -1;
  const monthLabels: Array<{ weekIdx: number; month: number }> = [];

  for (let i = 0; i < calendar.length; i++) {
    const cell = calendar[i];
    const d = new Date(cell.date + 'T00:00:00');
    const dow = d.getDay();
    const enriched: Cell = { ...cell, weekIdx: weeks.length, dayOfWeek: dow };
    currentWeek[dow] = enriched;

    if (dow === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    const m = d.getMonth();
    if (d.getDate() <= 7 && m !== lastMonth) {
      monthLabels.push({ weekIdx: weeks.length, month: m });
      lastMonth = m;
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return { weeks, monthLabels };
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
