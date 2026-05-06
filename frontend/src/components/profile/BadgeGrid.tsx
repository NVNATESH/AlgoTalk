'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Trophy } from 'lucide-react';
import type { Badge } from '@/types/badge';
import { cn } from '@/lib/utils';

const TIER_STYLES: Record<string, { ring: string; bg: string; label: string }> = {
  bronze: {
    ring: 'ring-orange-700/40',
    bg: 'from-orange-700/30 to-orange-900/30',
    label: 'text-orange-400',
  },
  silver: {
    ring: 'ring-zinc-400/40',
    bg: 'from-zinc-400/25 to-zinc-600/30',
    label: 'text-zinc-300',
  },
  gold: {
    ring: 'ring-amber-400/50',
    bg: 'from-amber-400/30 to-amber-600/40',
    label: 'text-amber-300',
  },
  platinum: {
    ring: 'ring-cyan-300/50',
    bg: 'from-cyan-300/30 to-violet-400/40',
    label: 'text-cyan-200',
  },
};

export function BadgeGrid({
  badges,
  showLocked = true,
}: {
  badges: Badge[];
  showLocked?: boolean;
}) {
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  const [hover, setHover] = useState<Badge | null>(null);

  if (earned.length === 0 && !showLocked) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
        No badges earned yet — start solving and goals to unlock the first one.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {earned.length > 0 && (
        <section>
          <SectionLabel
            label={`Earned · ${earned.length}`}
            sub={earned.length === badges.length ? 'You\'ve unlocked everything!' : undefined}
          />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {earned.map((b, i) => (
              <BadgeCell
                key={b.key}
                badge={b}
                index={i}
                onHover={setHover}
                glowMostRecent={i === 0}
              />
            ))}
          </div>
        </section>
      )}

      {showLocked && locked.length > 0 && (
        <section>
          <SectionLabel label={`Locked · ${locked.length}`} sub="Closest to earning shown first" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {locked.map((b, i) => (
              <BadgeCell key={b.key} badge={b} index={i} onHover={setHover} />
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{hover.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-100">{hover.name}</span>
                  <span
                    className={cn(
                      'rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                      hover.tier === 'bronze' && 'border-orange-700/40 text-orange-400',
                      hover.tier === 'silver' && 'border-zinc-400/40 text-zinc-300',
                      hover.tier === 'gold' && 'border-amber-400/50 text-amber-300',
                      hover.tier === 'platinum' && 'border-cyan-300/50 text-cyan-200'
                    )}
                  >
                    {hover.tier}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">{hover.description}</div>
              </div>
            </div>
            {!hover.earned && (
              <div className="mt-2">
                <div className="h-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia"
                    style={{ width: `${Math.round(hover.progress * 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  {Math.round(hover.progress * 100)}% to unlock
                </div>
              </div>
            )}
            {hover.earned && hover.earnedAt && (
              <div className="mt-1.5 text-[10px] text-zinc-500">
                Earned {new Date(hover.earnedAt).toLocaleDateString()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BadgeCell({
  badge,
  index,
  onHover,
  glowMostRecent = false,
}: {
  badge: Badge;
  index: number;
  onHover: (b: Badge | null) => void;
  glowMostRecent?: boolean;
}) {
  const style = TIER_STYLES[badge.tier] ?? TIER_STYLES.bronze;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ delay: index * 0.03 }}
      onMouseEnter={() => onHover(badge)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(badge)}
      onBlur={() => onHover(null)}
      className={cn(
        'group relative flex flex-col items-center gap-1 rounded-xl border p-3 transition',
        badge.earned
          ? cn('bg-gradient-to-br ring-1', style.bg, style.ring)
          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
      )}
    >
      {/* Glow */}
      {badge.earned && glowMostRecent && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/20 blur-md"
        />
      )}
      <div className="relative z-10 text-3xl">
        {badge.earned ? badge.icon : <span className="grayscale opacity-40">{badge.icon}</span>}
      </div>
      <div
        className={cn(
          'relative z-10 line-clamp-1 text-center text-[10px] font-semibold uppercase tracking-wider',
          badge.earned ? style.label : 'text-zinc-600'
        )}
      >
        {badge.name}
      </div>
      {!badge.earned && badge.progress > 0 && (
        <div className="relative z-10 h-0.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia"
            style={{ width: `${Math.round(badge.progress * 100)}%` }}
          />
        </div>
      )}
      {!badge.earned && badge.progress === 0 && (
        <Lock className="relative z-10 h-2.5 w-2.5 text-zinc-700" />
      )}
    </motion.button>
  );
}

function SectionLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <Trophy className="h-3.5 w-3.5" /> {label}
      </h3>
      {sub && <span className="text-[10px] text-zinc-500">{sub}</span>}
    </div>
  );
}
