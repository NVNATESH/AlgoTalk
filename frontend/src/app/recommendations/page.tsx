'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Search,
  Filter,
  Sparkles,
  Clock,
  Trophy,
  ArrowRight,
  Check,
  BookOpen,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useGoals } from '@/stores/goalStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Goal, GoalCategory } from '@/types/goal';

const CATEGORIES: Array<{ key: GoalCategory | 'all'; label: string; icon: string }> = [
  { key: 'all', label: 'All', icon: '🌐' },
  { key: 'dsa', label: 'DSA', icon: '📊' },
  { key: 'system_design', label: 'System Design', icon: '🏗️' },
  { key: 'sql', label: 'SQL', icon: '🗄️' },
  { key: 'dbms', label: 'DBMS', icon: '💾' },
  { key: 'fullstack', label: 'Full Stack', icon: '🌐' },
  { key: 'ai_ml', label: 'AI/ML', icon: '🤖' },
  { key: 'aptitude', label: 'Aptitude', icon: '🧮' },
  { key: 'company', label: 'Company', icon: '🏢' },
];

export default function RecommendationsPage() {
  const { recommended, fetchRecommended, recommendedLoading, enrollInGoal } = useGoals();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<GoalCategory | 'all'>('all');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    const opts: Record<string, string> = {};
    if (category !== 'all') opts.category = category;
    if (search) opts.search = search;
    fetchRecommended(opts);
  }, [fetchRecommended, category, search]);

  const handleEnroll = async (templateId: string) => {
    setEnrolling(templateId);
    try {
      await enrollInGoal(templateId, { deadlineDays: 30 });
      toast.success('Goal added to your dashboard!');
    } catch {
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <AppShell>
      <header className="mb-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-fuchsia">
            <Sparkles className="h-3 w-3" /> AI-Powered
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">⭐ Recommended Goals</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Curated learning paths and AI-generated roadmaps to ace interviews and master new skills.
          </p>
        </motion.div>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search goals..."
            className="input-base pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-4 w-4 text-zinc-500" />
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                category === c.key
                  ? 'border-accent-fuchsia/60 bg-accent-fuchsia/15 text-accent-fuchsia'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
              )}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Goals Grid */}
      {recommendedLoading && recommended.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass h-64 animate-pulse" />
          ))}
        </div>
      ) : recommended.length === 0 ? (
        <div className="glass flex flex-col items-center p-12 text-center">
          <div className="text-5xl">🔍</div>
          <h3 className="mt-3 font-display text-lg font-semibold">No goals found</h3>
          <p className="mt-1 text-sm text-zinc-400">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {recommended.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
              >
                <GoalTemplateCard goal={g} enrolling={enrolling === g.id} onEnroll={() => handleEnroll(g.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </AppShell>
  );
}

function GoalTemplateCard({ goal, enrolling, onEnroll }: { goal: Goal; enrolling: boolean; onEnroll: () => void }) {
  return (
    <div className={cn('glass group relative flex flex-col p-5 transition hover:border-white/20', goal.enrolled && 'border-accent-emerald/30')}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-2xl">{goal.icon}</div>
        <div className="flex items-center gap-1.5">
          {goal.companyTarget && (
            <span className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">{goal.companyTarget}</span>
          )}
          <span className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
            goal.difficulty === 'Beginner' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
            goal.difficulty === 'Intermediate' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            goal.difficulty === 'Advanced' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose',
            goal.difficulty === 'Master' && 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet',
          )}>{goal.difficulty}</span>
        </div>
      </div>

      <h3 className="font-display text-base font-semibold leading-snug text-zinc-100">{goal.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-[13px] text-zinc-400">{goal.description}</p>

      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {goal.modules.length} modules</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {goal.estimatedHours}h</span>
        <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-accent-amber" /> +{goal.xpReward} XP</span>
      </div>

      {goal.resources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {goal.resources.slice(0, 3).map((r, i) => (
            <span key={i} className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500">{r.type}</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {goal.enrolled ? (
          <Link href="/dashboard" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 px-4 py-2.5 text-sm font-medium text-accent-emerald transition hover:bg-accent-emerald/20">
            <Check className="h-4 w-4" /> Enrolled
          </Link>
        ) : (
          <button onClick={onEnroll} disabled={enrolling} className="btn-primary flex-1 py-2.5 text-sm">
            {enrolling ? (
              <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Enrolling...</span>
            ) : (
              <><ArrowRight className="h-4 w-4" /> Start Learning</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
