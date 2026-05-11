'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Gamepad2, ArrowRight, Zap, Star, Lock, CheckCircle2 } from 'lucide-react';
import { useGoals } from '@/stores/goalStore';
import { cn } from '@/lib/utils';

export function ActiveQuestsSection() {
  const { quests, fetchQuests, questsLoaded } = useGoals();

  useEffect(() => {
    if (!questsLoaded) fetchQuests();
  }, [fetchQuests, questsLoaded]);

  if (!questsLoaded && quests.length === 0) {
    return (
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-accent-emerald" /> Active Quests
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-28 w-64 shrink-0 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (quests.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-accent-emerald" /> Active Quests
        </h2>
        <Link
          href="/quests"
          className="flex items-center gap-1 text-xs font-medium text-accent-emerald hover:text-accent-violet transition"
        >
          Browse quests <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {quests.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="shrink-0"
          >
            <Link
              href={`/goals/${q.id}`}
              className="glass group block w-72 p-4 transition hover:border-accent-emerald/30"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-emerald/30 to-teal-600/10 text-xl">
                  {q.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-display text-sm font-semibold text-zinc-100 group-hover:text-accent-emerald transition">
                    {q.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-2.5 w-2.5 text-accent-emerald" /> +{q.xpReward} XP
                    </span>
                    <span>•</span>
                    <span className="text-accent-emerald font-medium">{q.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Quest module progression */}
              <div className="flex items-center gap-0.5">
                {q.modules.map((m, mi) => {
                  const isCompleted = m.status === 'completed';
                  const isActive = m.status === 'in_progress';
                  const isLocked = m.status === 'not_started' && mi > 0 && q.modules[mi - 1]?.status !== 'completed';

                  return (
                    <div key={m.moduleId} className="flex items-center">
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold transition',
                          isCompleted && 'bg-accent-emerald/20 text-accent-emerald',
                          isActive && 'bg-accent-emerald/30 text-white ring-1 ring-accent-emerald/50',
                          !isCompleted && !isActive && !isLocked && 'bg-white/5 text-zinc-500',
                          isLocked && 'bg-white/[0.02] text-zinc-700'
                        )}
                        title={m.title}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : isLocked ? (
                          <Lock className="h-2.5 w-2.5" />
                        ) : (
                          mi + 1
                        )}
                      </div>
                      {mi < q.modules.length - 1 && (
                        <div className={cn(
                          'h-px w-2',
                          isCompleted ? 'bg-accent-emerald/40' : 'bg-white/5'
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${q.progress}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-accent-emerald to-teal-400"
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
