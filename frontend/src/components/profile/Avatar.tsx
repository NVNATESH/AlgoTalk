'use client';

import { cn } from '@/lib/utils';

const PALETTES: Array<[string, string]> = [
  ['#8b5cf6', '#ec4899'],
  ['#10b981', '#06b6d4'],
  ['#f59e0b', '#f43f5e'],
  ['#06b6d4', '#8b5cf6'],
  ['#ec4899', '#f59e0b'],
  ['#10b981', '#a78bfa'],
];

function pickPalette(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || name.slice(0, 2).toUpperCase();

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [c1, c2] = pickPalette(name);
  const sizeClass = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-20 w-20 text-2xl',
    xl: 'h-28 w-28 text-3xl',
  }[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover ring-2 ring-white/10',
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ring-2 ring-white/10',
        sizeClass,
        className
      )}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      {initials(name)}
    </div>
  );
}
