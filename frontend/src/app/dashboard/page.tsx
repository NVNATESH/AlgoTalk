'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Briefcase, Plus, BookOpen } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { ContinueLearningSection } from '@/components/dashboard/ContinueLearningSection';
import { DailyStreakDisplay } from '@/components/dashboard/DailyStreakDisplay';
import { GoalCard } from '@/components/dashboard/GoalCard';
import { GoalTimeline } from '@/components/dashboard/GoalTimeline';
import { BurnoutBanner } from '@/components/dashboard/BurnoutBanner';
import { CreateGoalDialog } from '@/components/dashboard/CreateGoalDialog';
import { WeeklyProgressCard } from '@/components/dashboard/WeeklyProgressCard';
import { useGoals } from '@/stores/goalStore';
import { useAuth } from '@/stores/authStore';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'active' | 'paused' | 'completed';

export default function DashboardPage() {
  const { goals, fetch, loaded, loading, quests, fetchQuests } = useGoals();
  const user = useAuth((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<FilterTab>('all');

  useEffect(() => {
    fetch();
    fetchQuests();
  }, [fetch, fetchQuests]);

  const filtered = useMemo(() => {
    if (tab === 'all') return goals.filter((g) => g.status !== 'archived');
    return goals.filter((g) => g.status === tab);
  }, [goals, tab]);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const totalProgress =
    activeGoals.length === 0
      ? 0
      : Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length);

  const focused = activeGoals.find((g) => g.isFocus);
  const onTrack = activeGoals.filter((g) => {
    const left = (new Date(g.deadline).getTime() - Date.now()) / 86400000;
    const expected = ((Date.now() - new Date(g.startDate).getTime()) / (new Date(g.deadline).getTime() - new Date(g.startDate).getTime())) * 100;
    return left > 0 && g.progress >= expected - 10;
  }).length;

  const bestStreak = goals.reduce((m, g) => Math.max(m, g.streak ?? 0), 0);

  return (
    <AppShell>
      <DashboardHero
        userName={user?.name}
        xp={user?.xp ?? 0}
        rank={user?.level ?? 'Beginner'}
        streak={bestStreak}
        activeGoals={activeGoals.length}
        totalProgress={totalProgress}
        onTrack={onTrack}
        totalActive={activeGoals.length}
        focused={focused ? { name: focused.name, progress: focused.progress } : null}
        onCreateGoal={() => setCreateOpen(true)}
      />

      <GoalsJumpNav />

      <DailyStreakDisplay goals={goals} />

      <ContinueLearningSection goals={goals} />

      {/* Quest & Interview Quick Access */}
      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/quests"
          className="glass group flex items-start gap-4 p-5 transition hover:border-accent-violet/40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30 text-2xl">
            <Gamepad2 className="h-6 w-6 text-accent-violet" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold group-hover:text-accent-violet transition">
              Quest Challenges
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Structured, admin-curated learning paths with XP rewards. Master topics step-by-step.
            </p>
            {quests.length > 0 && (
              <p className="mt-2 text-xs text-accent-violet">
                {quests.length} active quest{quests.length > 1 ? 's' : ''} in progress
              </p>
            )}
          </div>
        </Link>
        <Link
          href="/goals/recommended"
          className="glass group flex items-start gap-4 p-5 transition hover:border-accent-emerald/40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-emerald/30 to-teal-500/30">
            <BookOpen className="h-6 w-6 text-accent-emerald" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold group-hover:text-accent-emerald transition">
              Curated Sheets
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Striver SDE Sheet, Love Babbar 450, NeetCode 150, Blind 75, company prep paths.
            </p>
          </div>
        </Link>
        <Link
          href="/interview"
          className="glass group flex items-start gap-4 p-5 transition hover:border-accent-cyan/40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-cyan/30 to-accent-emerald/30 text-2xl">
            <Briefcase className="h-6 w-6 text-accent-cyan" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold group-hover:text-accent-cyan transition">
              Interview Practice
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Company-specific mock interviews with AI feedback. DSA, System Design, SQL & more.
            </p>
          </div>
        </Link>
      </section>

      <WeeklyProgressCard />

      <section id="my-goals" className="mb-10 scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">My Goals</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Track active, paused, and completed learning plans.
            </p>
          </div>
        </div>

      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-white/5 pb-2">
        {(['all', 'active', 'paused', 'completed'] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition',
              tab === t ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
            )}
          >
            {t}
            <span className="ml-1.5 text-xs text-zinc-500">
              ({t === 'all' ? goals.filter((g) => g.status !== 'archived').length : goals.filter((g) => g.status === t).length})
            </span>
          </button>
        ))}
      </div>

      <BurnoutBanner />

      {!loaded && loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} firstTime={goals.length === 0} />
      ) : (
        <>
          {goals.filter((g) => g.status === 'active' && g.startDate && g.deadline).length >= 2 && (
            <section className="glass mb-4 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold">Timeline</h3>
                  <p className="text-[11px] text-zinc-500">
                    Start to deadline for every active goal. Today is the violet line.
                  </p>
                </div>
              </div>
              <GoalTimeline goals={goals} />
            </section>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((g, i) => (
                <motion.div key={g.id} layout exit={{ opacity: 0, scale: 0.96 }}>
                  <GoalCard goal={g} index={i} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      </section>

      <CreateGoalDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

function GoalsJumpNav() {
  const items = [
    { href: '#overview', label: 'Overview' },
    { href: '#my-goals', label: 'My Goals' },
    { href: '/goals/recommended', label: 'Curated Sheets' },
    { href: '/quests', label: 'Quests' },
    { href: '/interview', label: 'Interview Prep' },
  ];

  return (
    <div className="sticky top-[73px] z-20 -mx-2 mb-6 flex gap-1 overflow-x-auto border-y border-white/5 bg-bg/80 px-2 py-2 backdrop-blur md:static md:mx-0 md:border-y-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-accent-violet/40 hover:text-white"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass h-64 animate-pulse">
          <div className="space-y-3 p-5">
            <div className="h-12 w-12 rounded-xl bg-white/5" />
            <div className="h-4 w-3/4 rounded bg-white/5" />
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-2 w-full rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate, firstTime }: { onCreate: () => void; firstTime: boolean }) {
  return (
    <div className="glass flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 text-6xl">🚀</div>
      <h3 className="font-display text-2xl font-bold">
        {firstTime ? 'Welcome — create your first goal' : 'Nothing here yet'}
      </h3>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Tell Gemini what you want to learn and it'll design a personalized roadmap of modules,
        problems, and milestones.
      </p>
      <button onClick={onCreate} className="btn-primary mt-6">
        <Plus className="h-4 w-4" /> Create your first goal
      </button>
    </div>
  );
}
