'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Clock, ArrowRight, BookOpen } from 'lucide-react';
import type { Goal } from '@/types/goal';
import { cn } from '@/lib/utils';

interface ContinueLearningSectionProps {
  goals: Goal[];
}

export function ContinueLearningSection({ goals }: ContinueLearningSectionProps) {
  const inProgress = goals
    .filter(g => g.status === 'active' && g.progress > 0 && g.progress < 100)
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 8);

  if (inProgress.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Play className="h-4 w-4 text-accent-cyan" /> Continue Learning
        </h2>
        <Link
          href="/dashboard#my-goals"
          className="flex items-center gap-1 text-xs font-medium text-accent-cyan hover:text-accent-violet transition"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {inProgress.map((g, i) => {
          const nextModule = g.modules.find(m => m.status !== 'completed');
          const lastActivity = g.updatedAt ? timeAgo(g.updatedAt) : 'No activity';

          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="shrink-0"
            >
              <Link
                href={`/goals/${g.id}`}
                className="glass group block w-72 p-4 transition hover:border-accent-cyan/30"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-cyan/30 to-blue-600/10 text-xl">
                    {g.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-display text-sm font-semibold text-zinc-100 group-hover:text-accent-cyan transition">
                      {g.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500">{lastActivity}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${g.progress}%` }}
                    transition={{ duration: 0.8, delay: i * 0.04 + 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-blue-400"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-accent-cyan">{g.progress}%</span>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                    <span className="flex items-center gap-0.5">
                      <BookOpen className="h-2.5 w-2.5" /> {g.modules.filter(m => m.status === 'completed').length}/{g.modules.length}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {g.estimatedHours}h
                    </span>
                  </div>
                </div>

                {nextModule && (
                  <div className="mt-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-zinc-400">
                    <span className="text-zinc-600">Next:</span> {nextModule.title}
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
