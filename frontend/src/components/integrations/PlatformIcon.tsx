'use client';

import type { Platform } from '@/types/integration';
import { cn } from '@/lib/utils';

const PLATFORM_META: Record<
  Platform,
  { label: string; emoji: string; gradient: string; tagline: string }
> = {
  leetcode: {
    label: 'LeetCode',
    emoji: '🟧',
    gradient: 'from-amber-500 to-orange-600',
    tagline: 'Recent accepted submissions (public)',
  },
  codeforces: {
    label: 'Codeforces',
    emoji: '🟦',
    gradient: 'from-accent-cyan to-accent-violet',
    tagline: 'Last 200 submissions with full verdict',
  },
  codechef: {
    label: 'CodeChef',
    emoji: '👨‍🍳',
    gradient: 'from-orange-700 to-amber-700',
    tagline: 'Profile + recent submissions (public scrape)',
  },
  hackerrank: {
    label: 'HackerRank',
    emoji: '🟩',
    gradient: 'from-emerald-500 to-emerald-700',
    tagline: 'Recently solved challenges (public)',
  },
  atcoder: {
    label: 'AtCoder',
    emoji: '🇯🇵',
    gradient: 'from-zinc-500 to-zinc-700',
    tagline: 'Full submission history via Kenkoooo API',
  },
  gfg: {
    label: 'GeeksforGeeks',
    emoji: '🟢',
    gradient: 'from-green-700 to-emerald-700',
    tagline: 'Solved practice problems (public scrape)',
  },
  hackerearth: {
    label: 'HackerEarth',
    emoji: '🟣',
    gradient: 'from-violet-700 to-fuchsia-700',
    tagline: 'Practice profile (public scrape)',
  },
};

export function platformLabel(p: Platform) {
  return PLATFORM_META[p]?.label ?? p;
}

export function platformTagline(p: Platform) {
  return PLATFORM_META[p]?.tagline ?? '';
}

export function PlatformIcon({
  platform,
  size = 'md',
  className,
}: {
  platform: Platform;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const meta = PLATFORM_META[platform];
  const sizeClass = {
    sm: 'h-7 w-7 text-base',
    md: 'h-10 w-10 text-xl',
    lg: 'h-14 w-14 text-2xl',
  }[size];
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-display font-bold text-white shadow-lg',
        meta?.gradient ?? 'from-accent-violet to-accent-fuchsia',
        sizeClass,
        className
      )}
    >
      {meta?.emoji ?? '🌐'}
    </div>
  );
}

export const PLATFORMS: Platform[] = [
  'leetcode',
  'codeforces',
  'codechef',
  'hackerrank',
  'atcoder',
  'gfg',
  'hackerearth',
];
