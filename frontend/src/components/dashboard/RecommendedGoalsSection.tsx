'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Clock, Trophy, BookOpen } from 'lucide-react';
import { useGoals } from '@/stores/goalStore';
import type { Goal } from '@/types/goal';

export function RecommendedGoalsSection() {
  const { recommended, fetchRecommended, recommendedLoading } = useGoals();

  useEffect(() => {
    fetchRecommended();
  }, [fetchRecommended]);

  if (recommendedLoading && recommended.length === 0) {
    return (
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-fuchsia" /> Recommended Goals
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-36 w-64 shrink-0 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (recommended.length === 0) return null;

  const notEnrolled = recommended.filter(g => !g.enrolled).slice(0, 8);
  if (notEnrolled.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-fuchsia" /> Recommended Goals
        </h2>
        <Link
          href="/recommendations"
          className="flex items-center gap-1 text-xs font-medium text-accent-fuchsia hover:text-accent-violet transition"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {notEnrolled.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="shrink-0"
          >
            <Link
              href="/recommendations"
              className="glass group block w-64 p-4 transition hover:border-accent-fuchsia/30"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{g.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-display text-sm font-semibold text-zinc-100 group-hover:text-accent-fuchsia transition">
                    {g.name}
                  </h3>
                </div>
              </div>
              <p className="line-clamp-2 text-[11px] text-zinc-500 mb-3">{g.description}</p>
              <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                <span className="flex items-center gap-0.5"><BookOpen className="h-2.5 w-2.5" /> {g.modules.length}</span>
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {g.estimatedHours}h</span>
                <span className="flex items-center gap-0.5 text-accent-amber"><Trophy className="h-2.5 w-2.5" /> +{g.xpReward}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
