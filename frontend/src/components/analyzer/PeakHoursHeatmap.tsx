'use client';

import { useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const colorFor = (count: number, max: number) => {
  if (count === 0 || max === 0) return 'rgba(255,255,255,0.05)';
  const t = count / max;
  if (t > 0.85) return '#a78bfa';
  if (t > 0.6) return '#8b5cf6';
  if (t > 0.35) return '#7c3aed';
  if (t > 0.15) return '#5b21b6';
  return '#3b1f8b';
};

const formatHour = (h: number) => {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
};

export function PeakHoursHeatmap({
  grid,
  max,
  best,
}: {
  grid: number[][];
  max: number;
  best: { day: number; hour: number; count: number } | null;
}) {
  const [hover, setHover] = useState<{ day: number; hour: number; count: number } | null>(null);

  if (max === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
        No submission data yet — your peak-hours heatmap will appear here.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="w-10" />
              {Array.from({ length: 24 }).map((_, h) => (
                <th
                  key={h}
                  className="text-[9px] font-normal text-zinc-500"
                  style={{ minWidth: 16 }}
                >
                  {h % 3 === 0 ? formatHour(h) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, d) => (
              <tr key={day}>
                <td className="text-right text-[10px] text-zinc-500 pr-2">{day}</td>
                {grid[d].map((count, h) => (
                  <td
                    key={h}
                    style={{ background: colorFor(count, max) }}
                    className="h-4 cursor-pointer rounded-sm transition-all hover:opacity-80"
                    title={`${day} ${formatHour(h)} — ${count} submissions`}
                    onMouseEnter={() => setHover({ day: d, hour: h, count })}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500">
        <span>
          {best
            ? `🔥 Peak: ${DAYS[best.day]} ${formatHour(best.hour)} (${best.count} subs)`
            : ''}
        </span>
        <span className="flex items-center gap-1.5">
          Less
          {[0.1, 0.3, 0.6, 0.9].map((t) => (
            <span
              key={t}
              className="h-2 w-2.5 rounded-sm"
              style={{ background: colorFor(Math.ceil(t * max), max) }}
            />
          ))}
          More
        </span>
      </div>

      {hover && (
        <div className="mt-2 text-xs text-zinc-400">
          <span className="font-medium text-zinc-200">{DAYS[hover.day]} {formatHour(hover.hour)}</span> ·
          <span className="ml-1 tabular-nums">
            {hover.count} submission{hover.count === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
  );
}
