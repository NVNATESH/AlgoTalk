'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Target, TrendingUp, Calendar } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { GoalCard } from '@/components/dashboard/GoalCard';
import { GoalTimeline } from '@/components/dashboard/GoalTimeline';
import { BurnoutBanner } from '@/components/dashboard/BurnoutBanner';
import { CreateGoalDialog } from '@/components/dashboard/CreateGoalDialog';
import { useGoals } from '@/stores/goalStore';
import { useAuth } from '@/stores/authStore';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'active' | 'paused' | 'completed';

export default function DashboardPage() {
  const { goals, fetch, loaded, loading } = useGoals();
  const user = useAuth((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<FilterTab>('all');

  useEffect(() => {
    fetch();
  }, [fetch]);

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

  const subtitle = (() => {
    if (activeGoals.length === 0) return "You're a clean slate. Pick something to learn.";
    if (focused) return `You're focused on "${focused.name}" — ${focused.progress}% there.`;
    if (totalProgress >= 70) return `You're ${totalProgress}% on track this week — keep going!`;
    if (totalProgress < 25 && activeGoals.length > 0) return '⚠️ Most goals are early — pick one and start.';
    return `${onTrack}/${activeGoals.length} goals on track. Pace yourself.`;
  })();

  return (
    <AppShell>
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-accent-violet">
              <Sparkles className="h-3 w-3" /> {greet(user?.name)}
            </div>
            <h1 className="mt-1 font-display text-4xl font-bold tracking-tight md:text-5xl">
              🎯 My Goals Dashboard
            </h1>
            <p className="mt-2 text-zinc-400">{subtitle}</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Goal
          </button>
        </motion.div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SmartStat
            icon={Target}
            label="Active goals"
            value={String(activeGoals.length)}
            tint="violet"
          />
          <SmartStat
            icon={TrendingUp}
            label="Avg. progress"
            value={`${totalProgress}%`}
            tint="emerald"
          />
          <SmartStat
            icon={Sparkles}
            label="On track"
            value={`${onTrack}/${activeGoals.length || 0}`}
            tint="cyan"
          />
          <SmartStat
            icon={Calendar}
            label="Total XP"
            value={String(user?.xp ?? 0)}
            tint="fuchsia"
          />
        </div>
      </header>

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
                    Start → deadline for every active goal · today is the violet line.
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

      <CreateGoalDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

function greet(name?: string) {
  const h = new Date().getHours();
  const part = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name.split(' ')[0]}` : part;
}

function SmartStat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tint: 'violet' | 'emerald' | 'cyan' | 'fuchsia';
}) {
  const map = {
    violet: 'from-accent-violet/30 to-accent-violet/5 text-accent-violet',
    emerald: 'from-accent-emerald/30 to-accent-emerald/5 text-accent-emerald',
    cyan: 'from-accent-cyan/30 to-accent-cyan/5 text-accent-cyan',
    fuchsia: 'from-accent-fuchsia/30 to-accent-fuchsia/5 text-accent-fuchsia',
  } as const;
  return (
    <div className="glass flex items-center gap-3 p-4">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br', map[tint])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      </div>
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
