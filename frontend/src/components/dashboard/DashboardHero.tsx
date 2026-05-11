'use client';

import { motion } from 'framer-motion';
import { Calendar, Flame, Plus, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHeroProps {
  userName?: string;
  xp: number;
  rank: string;
  streak: number;
  activeGoals: number;
  totalProgress: number;
  onTrack: number;
  totalActive: number;
  focused?: { name: string; progress: number } | null;
  onCreateGoal: () => void;
}

export function DashboardHero({
  userName,
  xp,
  rank,
  streak,
  activeGoals,
  totalProgress,
  onTrack,
  totalActive,
  focused,
  onCreateGoal,
}: DashboardHeroProps) {
  const greetName = userName?.split(' ')[0] ?? '';
  const h = new Date().getHours();
  const greeting = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const subtitle = (() => {
    if (activeGoals === 0) return "You're a clean slate. Pick something to learn.";
    if (focused) return `You're focused on "${focused.name}" — ${focused.progress}% there.`;
    if (totalProgress >= 70) return `You're ${totalProgress}% on track this week — keep going!`;
    if (totalProgress < 25 && activeGoals > 0) return '⚠️ Most goals are early — pick one and start.';
    return `${onTrack}/${totalActive} goals on track. Pace yourself.`;
  })();

  return (
    <header id="overview" className="mb-8 scroll-mt-24">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-accent-violet">
            <Sparkles className="h-3 w-3" /> {greeting}{greetName ? `, ${greetName}` : ''}
          </div>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight md:text-5xl">My Goals</h1>
          <p className="mt-2 text-zinc-400">{subtitle}</p>
        </div>
        <button onClick={onCreateGoal} className="btn-primary">
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <HeroStat icon={Target} label="Active Goals" value={String(activeGoals)} tint="violet" />
        <HeroStat icon={TrendingUp} label="Avg. Progress" value={`${totalProgress}%`} tint="emerald" />
        <HeroStat icon={Sparkles} label="On Track" value={`${onTrack}/${totalActive}`} tint="cyan" />
        <HeroStat icon={Calendar} label="Total XP" value={String(xp)} tint="fuchsia" />
        <div className="glass col-span-2 flex items-center gap-4 p-4 md:col-span-1">
          <div className="relative">
            <Flame className={cn('h-8 w-8 transition-all', streak > 0 ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,.5)]' : 'text-zinc-600')} />
            {streak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow"
              >
                {streak}
              </motion.div>
            )}
          </div>
          <div>
            <div className="font-display text-2xl font-bold tabular-nums">{streak}d</div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Streak</div>
          </div>
        </div>
      </div>

      {/* Rank badge */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-3 flex items-center gap-3"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-violet/30 bg-accent-violet/10 px-3 py-1 text-xs font-semibold text-accent-violet">
          <Trophy className="h-3 w-3" /> {rank}
        </span>
        <span className="text-xs text-zinc-500">{xp} XP total</span>
      </motion.div>
    </header>
  );
}

function HeroStat({
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
