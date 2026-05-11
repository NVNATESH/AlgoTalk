'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Gamepad2,
  Zap,
  ArrowRight,
  BookOpen,
  Clock,
  Trophy,
  Sparkles,
  Check,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useGoals } from '@/stores/goalStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Goal } from '@/types/goal';

const QUEST_TOPICS = [
  { key: 'all', label: 'All Quests', icon: '🎮' },
  { key: 'dsa', label: 'DSA', icon: '📊' },
  { key: 'sql', label: 'SQL', icon: '🗄️' },
  { key: 'dbms', label: 'DBMS', icon: '💾' },
  { key: 'system_design', label: 'System Design', icon: '🏗️' },
  { key: 'aptitude', label: 'Aptitude', icon: '🧮' },
];

export default function QuestsPage() {
  const { quests, questTemplates, fetchQuests, questsLoaded, enrollInGoal } = useGoals();
  const [filter, setFilter] = useState('all');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleEnroll = async (templateId: string) => {
    setEnrolling(templateId);
    try {
      await enrollInGoal(templateId, { deadlineDays: 30 });
      toast.success('Quest started! Check your dashboard.');
      fetchQuests();
    } catch {
      toast.error('Failed to start quest');
    } finally {
      setEnrolling(null);
    }
  };

  const filteredTemplates = filter === 'all'
    ? questTemplates
    : questTemplates.filter(q => q.category === filter);

  const enrolledIds = new Set(quests.map(q => q.templateId).filter(Boolean));

  return (
    <AppShell>
      <header className="mb-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-emerald">
            <Gamepad2 className="h-3 w-3" /> Quest-Based Learning
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">🎮 Quests</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Structured topic-based learning journeys with XP rewards. Master one, unlock the next.
          </p>
        </motion.div>
      </header>

      {/* Active Quests */}
      {quests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-emerald" /> Your Active Quests
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quests.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/goals/${q.id}`} className="glass group block p-4 transition hover:border-accent-emerald/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-emerald/30 to-teal-600/10 text-xl">
                      {q.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate font-display text-sm font-semibold">{q.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{q.modules.length} modules</span>
                        <span>•</span>
                        <span className="text-accent-emerald">{q.progress}%</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-accent-emerald" />
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-emerald to-teal-400 transition-all"
                      style={{ width: `${q.progress}%` }}
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Topic filters */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {QUEST_TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              filter === t.key
                ? 'border-accent-emerald/60 bg-accent-emerald/15 text-accent-emerald'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Quest templates */}
      {!questsLoaded ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass h-52 animate-pulse" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="glass flex flex-col items-center p-12 text-center">
          <div className="text-5xl">🎮</div>
          <h3 className="mt-3 font-display text-lg font-semibold">No quests in this category</h3>
          <p className="mt-1 text-sm text-zinc-400">Check back later or try another topic.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((q, i) => {
            const isEnrolled = enrolledIds.has(q.id);
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
              >
                <div className={cn(
                  'glass group flex flex-col p-5 transition hover:border-white/20',
                  isEnrolled && 'border-accent-emerald/30'
                )}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-emerald/30 to-teal-600/10 text-2xl">
                      {q.icon}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
                        q.difficulty === 'Beginner' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                        q.difficulty === 'Intermediate' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                        q.difficulty === 'Advanced' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose',
                        q.difficulty === 'Master' && 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet',
                      )}>{q.difficulty}</span>
                    </div>
                  </div>

                  <h3 className="font-display text-base font-semibold leading-snug text-zinc-100">{q.name}</h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-[13px] text-zinc-400">{q.description}</p>

                  {/* Quest modules preview */}
                  <div className="mt-3 flex items-center gap-1">
                    {q.modules.slice(0, 6).map((m, mi) => (
                      <div
                        key={m.moduleId}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold text-zinc-500"
                        title={m.title}
                      >
                        {mi + 1}
                      </div>
                    ))}
                    {q.modules.length > 6 && (
                      <span className="text-[10px] text-zinc-600 ml-1">+{q.modules.length - 6}</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {q.modules.length} stages</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {q.estimatedHours}h</span>
                    <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-accent-amber" /> +{q.xpReward} XP</span>
                  </div>

                  <div className="mt-4">
                    {isEnrolled ? (
                      <Link href="/dashboard" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 px-4 py-2.5 text-sm font-medium text-accent-emerald transition hover:bg-accent-emerald/20">
                        <Check className="h-4 w-4" /> In Progress
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnroll(q.id)}
                        disabled={enrolling === q.id}
                        className="btn-primary w-full py-2.5 text-sm"
                        style={{ background: 'linear-gradient(90deg, #10b981, #06b6d4)' }}
                      >
                        {enrolling === q.id ? (
                          <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Starting...</span>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Start Quest</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
