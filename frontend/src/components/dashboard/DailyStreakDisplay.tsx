'use client';

import { motion } from 'framer-motion';
import { Flame, Calendar } from 'lucide-react';
import type { Goal } from '@/types/goal';
import { cn } from '@/lib/utils';

interface DailyStreakDisplayProps {
  goals: Goal[];
}

export function DailyStreakDisplay({ goals }: DailyStreakDisplayProps) {
  const bestStreak = goals.reduce((m, g) => Math.max(m, g.streak ?? 0), 0);
  const activeGoals = goals.filter(g => g.status === 'active');

  // Build a 7-day activity map from goal lastActivityAt / updatedAt
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekActivity: boolean[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const hadActivity = activeGoals.some(g => {
      const updated = g.updatedAt ? new Date(g.updatedAt).getTime() : 0;
      return updated >= dayStart && updated < dayEnd;
    });
    weekActivity.push(hadActivity);
  }

  if (bestStreak === 0 && !weekActivity.some(Boolean)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass mb-4 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div
              animate={bestStreak > 0 ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className={cn(
                'h-7 w-7',
                bestStreak > 0 ? 'text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,.6)]' : 'text-zinc-600'
              )} />
            </motion.div>
            {bestStreak > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-[9px] font-bold text-white shadow-lg"
              >
                {bestStreak}
              </motion.div>
            )}
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold">
              {bestStreak > 0 ? `🔥 ${bestStreak}-day streak!` : 'Start a streak'}
            </h3>
            <p className="text-[11px] text-zinc-500">
              {bestStreak > 0
                ? "Don't break the chain — keep learning today!"
                : 'Complete any activity to start your streak.'}
            </p>
          </div>
        </div>
      </div>

      {/* 7-day heatmap */}
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3 w-3 text-zinc-600 mr-1" />
        {weekActivity.map((active, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - (6 - i));
          const dayName = dayNames[d.getDay()];
          const isToday = i === 6;

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-medium transition-all',
                  active
                    ? 'bg-accent-emerald/30 text-accent-emerald ring-1 ring-accent-emerald/20'
                    : 'bg-white/[0.03] text-zinc-700',
                  isToday && !active && 'ring-1 ring-white/10'
                )}
                title={`${dayName}: ${active ? 'Active' : 'No activity'}`}
              >
                {active ? '✓' : '·'}
              </div>
              <span className={cn('text-[8px]', isToday ? 'text-zinc-400 font-medium' : 'text-zinc-700')}>
                {isToday ? 'Today' : dayName.slice(0, 1)}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
