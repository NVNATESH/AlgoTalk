'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  Gamepad2,
  Loader2,
  Search,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { useGoals } from '@/stores/goalStore';
import { cn } from '@/lib/utils';

type GoalType = 'recommended' | 'quest' | 'company_prep' | '';
type Category = 'dsa' | 'system_design' | 'sql' | 'company' | 'fullstack' | 'ai_ml' | '';

interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  topic: string;
  difficulty: string;
  goalType: GoalType;
  category: Category;
  companyTarget?: string;
  roleTarget?: string;
  moduleCount: number;
  estimatedHours: number;
  xpReward: number;
  enrolled: boolean;
  rationale: string;
}

const TYPE_TABS: { value: GoalType | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Star className="h-4 w-4" /> },
  { value: 'recommended', label: 'Coding Sheets', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'quest', label: 'Quests', icon: <Gamepad2 className="h-4 w-4" /> },
  { value: 'company_prep', label: 'Company Prep', icon: <Building2 className="h-4 w-4" /> },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
  Intermediate: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Advanced: 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose',
  Master: 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet',
};

export default function RecommendedGoalsPage() {
  const { enrollInGoal } = useGoals();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [goalType, setGoalType] = useState<GoalType | 'all'>('all');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (goalType && goalType !== 'all') params.set('goalType', goalType);
      if (search) params.set('search', search);
      const res = await api<{ goals: Template[] }>(`/goals/recommended?${params.toString()}`, { auth: true });
      setTemplates(res.goals);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [goalType, search]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleEnroll = async (template: Template) => {
    if (template.enrolled) {
      toast.info(`You're already enrolled in "${template.name}"`);
      return;
    }
    setEnrolling(template.id);
    try {
      const goal = await enrollInGoal(template.id, { deadlineDays: 120, weeklyHours: 10 });
      toast.success(`Enrolled in "${template.name}"! Check your goals.`);
      setTemplates((prev) => prev.map((t) => t.id === template.id ? { ...t, enrolled: true } : t));
      setTimeout(() => router.push(`/goals/${goal.id}`), 800);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Enrollment failed');
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-emerald">
          <Sparkles className="h-3.5 w-3.5" /> Admin Curated
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">Curated Goal Templates</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Admin-curated coding sheets, quests, and company-specific prep paths. Click "Enroll" to add any to your goals — no AI needed.
        </p>
      </header>

      {/* Type Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setGoalType(tab.value as any)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
              goalType === tab.value
                ? 'border-accent-violet/50 bg-accent-violet/20 text-accent-violet'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200'
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sheets, topics, companies..."
          className="input-base pl-10"
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t, i) => (
            <TemplateCard
              key={t.id}
              template={t}
              index={i}
              enrolling={enrolling === t.id}
              onEnroll={() => handleEnroll(t)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function TemplateCard({
  template, index, enrolling, onEnroll,
}: {
  template: Template; index: number; enrolling: boolean; onEnroll: () => void;
}) {
  const typeColor: Record<string, string> = {
    recommended: 'from-accent-emerald/20 to-teal-500/20 border-accent-emerald/20',
    quest: 'from-accent-violet/20 to-accent-fuchsia/20 border-accent-violet/20',
    company_prep: 'from-accent-cyan/20 to-blue-500/20 border-accent-cyan/20',
  };
  const typeIcon: Record<string, React.ReactNode> = {
    recommended: <BookOpen className="h-4 w-4 text-accent-emerald" />,
    quest: <Gamepad2 className="h-4 w-4 text-accent-violet" />,
    company_prep: <Building2 className="h-4 w-4 text-accent-cyan" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5) }}
      className={cn(
        'glass flex flex-col border bg-gradient-to-br transition-all',
        typeColor[template.goalType] || '',
        template.enrolled && 'opacity-80'
      )}
    >
      <div className="flex-1 p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{template.icon}</span>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                {typeIcon[template.goalType]}
                <span className="uppercase tracking-wider font-medium">
                  {template.goalType === 'recommended' ? 'Sheet' : template.goalType === 'quest' ? 'Quest' : 'Company Prep'}
                </span>
              </div>
              {template.companyTarget && (
                <span className="text-[10px] font-medium text-accent-cyan">{template.companyTarget}</span>
              )}
            </div>
          </div>
          {template.enrolled && (
            <span className="flex items-center gap-1 rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">
              <Check className="h-3 w-3" /> Enrolled
            </span>
          )}
        </div>

        <h3 className="font-display text-base font-bold leading-snug">{template.name}</h3>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-3">{template.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', DIFFICULTY_COLORS[template.difficulty] || '')}>
            {template.difficulty}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <BookOpen className="h-3 w-3" /> {template.moduleCount} modules
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Timer className="h-3 w-3" /> ~{template.estimatedHours}h
          </span>
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <Trophy className="h-3 w-3" /> {template.xpReward} XP
          </span>
        </div>
      </div>

      <div className="border-t border-white/5 px-5 py-3">
        <button
          onClick={onEnroll}
          disabled={enrolling || template.enrolled}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-all',
            template.enrolled
              ? 'bg-accent-emerald/10 text-accent-emerald cursor-default'
              : 'btn-primary'
          )}
        >
          {enrolling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : template.enrolled ? (
            <><Check className="h-4 w-4" /> Already Enrolled</>
          ) : (
            <><Zap className="h-4 w-4" /> Enroll — Add to Goals</>
          )}
        </button>
      </div>
    </motion.div>
  );
}
