'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const fmt = (n: number) => String(n).padStart(2, '0');

export function Countdown({
  to,
  className,
  prefix,
}: {
  to: string | Date;
  className?: string;
  prefix?: string;
}) {
  const target = typeof to === 'string' ? new Date(to) : to;
  const compute = () => Math.max(0, target.getTime() - Date.now());
  const [ms, setMs] = useState(compute);

  useEffect(() => {
    setMs(compute());
    const id = setInterval(() => setMs(compute()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.getTime()]);

  const expired = ms === 0;
  const totalS = Math.floor(ms / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;

  // Color based on time remaining
  const tone = expired
    ? 'text-zinc-500'
    : ms <= 60 * 60 * 1000
      ? 'text-accent-rose'
      : ms <= 6 * 60 * 60 * 1000
        ? 'text-amber-300'
        : 'text-accent-emerald';

  if (expired) {
    return <span className={cn('font-mono text-xs', tone, className)}>Expired</span>;
  }

  return (
    <span className={cn('font-mono text-xs tabular-nums', tone, className)}>
      {prefix && <span className="mr-1 text-zinc-500">{prefix}</span>}
      {fmt(h)}:{fmt(m)}:{fmt(s)}
    </span>
  );
}
