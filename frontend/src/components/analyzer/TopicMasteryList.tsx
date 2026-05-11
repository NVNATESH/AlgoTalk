'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from 'lucide-react';
import type { TopicMastery } from '@/types/analyzer';
import { cn } from '@/lib/utils';

const masteryColor = (m: number) => {
  if (m >= 75) return '#10b981';
  if (m >= 50) return '#f59e0b';
  if (m >= 25) return '#06b6d4';
  return '#f43f5e';
};

const trendIcon = (t: TopicMastery['recentTrend']) => {
  if (t === 'improving') return <ArrowUpRight className="h-3 w-3 text-accent-emerald" />;
  if (t === 'declining') return <ArrowDownRight className="h-3 w-3 text-accent-rose" />;
  if (t === 'new') return <Sparkles className="h-3 w-3 text-accent-violet" />;
  return <Minus className="h-3 w-3 text-zinc-500" />;
};

const trendLabel = (t: TopicMastery['recentTrend']) => ({
  improving: 'Improving',
  declining: 'Declining',
  stable: 'Steady',
  new: 'New',
})[t];

export function TopicMasteryList({ topics }: { topics: TopicMastery[] }) {
  if (topics.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
        Solve a few problems to start building your topic mastery profile.
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {topics.map((t, i) => (
        <motion.li
          key={t.topic}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(i * 0.025, 0.25) }}
          className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium text-zinc-100">{t.topic}</span>
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                {trendIcon(t.recentTrend)} {trendLabel(t.recentTrend)}
              </span>
            </div>
            <span
              className="font-mono text-xs font-bold tabular-nums"
              style={{ color: masteryColor(t.mastery) }}
            >
              {t.mastery}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${t.mastery}%` }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: masteryColor(t.mastery) }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
            <span>
              Solved <span className="text-zinc-300 tabular-nums">{t.solved}</span>/
              <span className="tabular-nums">{t.attempted}</span> attempted
            </span>
            <span className="tabular-nums">{t.acceptanceRate}% acceptance</span>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
