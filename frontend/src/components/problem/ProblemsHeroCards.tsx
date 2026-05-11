'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  Clock,
  Gamepad2,
  Layers3,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
  Lock,
  TrendingUp,
  Users,
  Code2,
  GraduationCap,
  Check,
} from 'lucide-react';
import { useGoals } from '@/stores/goalStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Goal } from '@/types/goal';

/* ── Company data with real info ── */
const COMPANIES = [
  { name: 'Google', short: 'G', color: 'from-blue-500/20 to-green-500/20', questions: 1847, trending: ['Arrays', 'DP', 'Graphs'] },
  { name: 'Amazon', short: 'AZ', color: 'from-orange-500/20 to-yellow-500/20', questions: 2134, trending: ['Trees', 'BFS/DFS', 'DP'] },
  { name: 'Microsoft', short: 'MS', color: 'from-blue-600/20 to-cyan-500/20', questions: 1623, trending: ['Arrays', 'Strings', 'Trees'] },
  { name: 'Meta', short: 'M', color: 'from-blue-500/20 to-indigo-500/20', questions: 987, trending: ['Graphs', 'DP', 'Strings'] },
  { name: 'Apple', short: 'AP', color: 'from-zinc-400/20 to-zinc-600/20', questions: 756, trending: ['Arrays', 'Trees', 'Design'] },
  { name: 'Adobe', short: 'AD', color: 'from-red-500/20 to-rose-500/20', questions: 634, trending: ['DP', 'Backtracking', 'Matrix'] },
  { name: 'Flipkart', short: 'FK', color: 'from-yellow-500/20 to-blue-500/20', questions: 523, trending: ['Arrays', 'Graphs', 'DP'] },
  { name: 'Atlassian', short: 'AT', color: 'from-blue-600/20 to-blue-400/20', questions: 312, trending: ['Graphs', 'Hash Maps', 'BFS'] },
  { name: 'PayPal', short: 'PP', color: 'from-blue-700/20 to-cyan-400/20', questions: 287, trending: ['Strings', 'DP', 'Design'] },
  { name: 'TCS', short: 'TC', color: 'from-blue-500/20 to-purple-500/20', questions: 450, trending: ['Aptitude', 'Coding', 'SQL'] },
  { name: 'Infosys', short: 'IN', color: 'from-blue-500/20 to-teal-500/20', questions: 380, trending: ['DSA', 'DBMS', 'OOP'] },
  { name: 'Zoho', short: 'ZH', color: 'from-red-500/20 to-orange-500/20', questions: 567, trending: ['C', 'Patterns', 'Advanced'] },
];

const INTERVIEW_CATEGORIES = [
  { label: 'DSA', icon: Code2, count: '8,000+' },
  { label: 'SQL', icon: Layers3, count: '1,200+' },
  { label: 'System Design', icon: Building2, count: '500+' },
  { label: 'HR & Behavioral', icon: Users, count: '300+' },
];

export function ProblemsHeroCards() {
  const { quests, questTemplates, fetchQuests, recommended, fetchRecommended, enrollInGoal } = useGoals();
  const [activeCompany, setActiveCompany] = useState(0);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetchQuests().catch(() => undefined);
    fetchRecommended().catch(() => undefined);
  }, [fetchQuests, fetchRecommended]);

  // Cycle companies every 3s
  useEffect(() => {
    const id = setInterval(() => setActiveCompany((p) => (p + 1) % COMPANIES.length), 3000);
    return () => clearInterval(id);
  }, []);

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

  const questCount = questTemplates.length || 12;
  const recommendedCount = recommended.length || 25;

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ─── LEFT: Interview Questions Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="glass flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-bg-card to-bg-card p-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-violet to-violet-700 shadow-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-zinc-100">Interview Questions</h3>
                  <p className="text-[11px] text-zinc-500">Company-wise & role-based preparation</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-violet/25 bg-accent-violet/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
                <TrendingUp className="h-3 w-3" /> 10,000+ Qs
              </span>
            </div>

            {/* Company Grid */}
            <div className="flex-1 px-5 py-4">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {COMPANIES.map((c, i) => (
                  <motion.button
                    key={c.name}
                    onClick={() => setActiveCompany(i)}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className={cn(
                      'group relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all duration-200',
                      activeCompany === i
                        ? 'border-accent-violet/40 bg-accent-violet/10 shadow-md shadow-accent-violet/20'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/5 hover:shadow-sm hover:shadow-white/5'
                    )}
                  >
                    {activeCompany === i && (
                      <motion.div
                        layoutId="company-glow"
                        className="absolute inset-0 rounded-lg bg-accent-violet/5"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className={cn(
                      'relative flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br text-[10px] font-bold text-zinc-300 transition-all duration-200 group-hover:scale-110 group-hover:text-white',
                      c.color,
                      activeCompany === i && 'text-white ring-1 ring-accent-violet/30'
                    )}>
                      {c.short}
                    </span>
                    <span className={cn(
                      'relative text-[10px] font-medium transition-all duration-200',
                      activeCompany === i ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'
                    )}>
                      {c.name}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Active company detail */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCompany}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-200">{COMPANIES[activeCompany].name}</h4>
                      <p className="text-[11px] text-zinc-500">{COMPANIES[activeCompany].questions} questions available</p>
                    </div>
                    <motion.div whileHover={{ scale: 1.05, x: 2 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        href={`/problems/company/${COMPANIES[activeCompany].name.toLowerCase()}`}
                        className="flex items-center gap-1 rounded-lg bg-accent-violet/15 px-3 py-1.5 text-xs font-medium text-accent-violet transition hover:bg-accent-violet/25 hover:shadow-sm hover:shadow-accent-violet/20"
                      >
                        Practice <ArrowRight className="h-3 w-3" />
                      </Link>
                    </motion.div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {COMPANIES[activeCompany].trending.map((t, idx) => (
                      <motion.span
                        key={t}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.06 }}
                        className="rounded-full border border-accent-violet/20 bg-accent-violet/5 px-2 py-0.5 text-[10px] text-accent-violet/80 transition-colors hover:bg-accent-violet/15 hover:text-accent-violet cursor-default"
                      >
                        {t}
                      </motion.span>
                    ))}
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500">Trending</span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Category stats */}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {INTERVIEW_CATEGORIES.map((cat, idx) => (
                  <motion.div
                    key={cat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    whileHover={{ scale: 1.05, y: -2, borderColor: 'rgba(139,92,246,0.3)' }}
                    className="flex cursor-default items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 transition-shadow hover:shadow-md hover:shadow-accent-violet/10"
                  >
                    <cat.icon className="h-3.5 w-3.5 text-accent-violet/70" />
                    <div>
                      <div className="text-[10px] font-bold text-zinc-300">{cat.count}</div>
                      <div className="text-[9px] text-zinc-600">{cat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-5 py-3">
              <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link
                  href="/problems/companies"
                  className="group flex items-center justify-between text-sm font-medium text-accent-violet transition hover:text-accent-violet/80"
                >
                  <span>Browse all companies</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ─── RIGHT: Quests + Recommended Goals Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex flex-col gap-4"
        >
          {/* ── Quests Card ── */}
          <div className="glass overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-bg-card to-bg-card">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-emerald to-teal-600 shadow-lg">
                  <Gamepad2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-zinc-100">Quests</h3>
                  <p className="text-[10px] text-zinc-500">Topic progression with XP rewards</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-emerald/25 bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-accent-emerald">
                <Trophy className="h-3 w-3" /> {questCount} quests
              </span>
            </div>

            <div className="px-5 py-3">
              {/* Active quests */}
              {quests.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent-emerald">Your Active Quests</div>
                  <div className="space-y-1.5">
                    {quests.slice(0, 2).map((q) => (
                      <motion.div key={q.id} whileHover={{ scale: 1.02, x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                        <Link href={`/goals/${q.id}`} className="group flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-all hover:border-accent-emerald/30 hover:shadow-sm hover:shadow-accent-emerald/10">
                          <span className="text-lg transition-transform group-hover:scale-125">{q.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-xs font-medium text-zinc-200 group-hover:text-accent-emerald transition-colors">{q.name}</div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                              <span>{q.modules.length} stages</span>
                              <span className="text-accent-emerald">{q.progress}%</span>
                            </div>
                          </div>
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-white/5">
                            <motion.div
                              className="h-full rounded-full bg-accent-emerald"
                              initial={{ width: 0 }}
                              animate={{ width: `${q.progress}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                            />
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-600 transition-all group-hover:text-accent-emerald group-hover:translate-x-0.5" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quest templates preview */}
              <div className="flex flex-wrap gap-1.5">
                {(questTemplates.length > 0 ? questTemplates : []).slice(0, 4).map((q) => (
                  <motion.span
                    key={q.id}
                    whileHover={{ scale: 1.08, y: -1 }}
                    className="inline-flex cursor-default items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-zinc-400 transition-colors hover:border-accent-emerald/25 hover:bg-accent-emerald/5 hover:text-accent-emerald"
                  >
                    {q.icon} {q.name.replace(/Quest:?\s*/i, '').slice(0, 20)}
                  </motion.span>
                ))}
                {questTemplates.length > 4 && (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-zinc-500">+{questTemplates.length - 4} more</span>
                )}
              </div>
            </div>

            <div className="border-t border-white/5 px-5 py-2.5">
              <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link href="/quests" className="group flex items-center justify-between text-xs font-medium text-accent-emerald transition hover:text-accent-emerald/80">
                  <span>Browse all quests</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </div>

          {/* ── Recommended Goals Card ── */}
          <div className="glass overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-bg-card to-bg-card">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-fuchsia to-pink-700 shadow-lg">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-zinc-100">Recommended Goals</h3>
                  <p className="text-[10px] text-zinc-500">Curated paths & AI study plans</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-fuchsia/25 bg-accent-fuchsia/10 px-2 py-0.5 text-[10px] font-semibold text-accent-fuchsia">
                <Sparkles className="h-3 w-3" /> {recommendedCount}+ goals
              </span>
            </div>

            <div className="px-5 py-3">
              {/* Goals grid — show top 3 recommended goals with quick enroll */}
              <div className="space-y-1.5">
                {(recommended.length > 0 ? recommended : []).slice(0, 3).map((g, idx) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.06 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="group flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition-all hover:border-accent-fuchsia/30 hover:shadow-sm hover:shadow-accent-fuchsia/10 cursor-default"
                  >
                    <span className="text-lg transition-transform group-hover:scale-125">{g.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs font-medium text-zinc-200">{g.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-0.5"><BookOpen className="h-2.5 w-2.5" /> {g.modules.length}</span>
                        <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {g.estimatedHours}h</span>
                        <span className="flex items-center gap-0.5 text-amber-400"><Star className="h-2.5 w-2.5" /> +{g.xpReward}</span>
                      </div>
                    </div>
                    {g.enrolled ? (
                      <span className="flex items-center gap-1 rounded-md border border-accent-emerald/30 bg-accent-emerald/10 px-2 py-1 text-[10px] font-medium text-accent-emerald">
                        <Check className="h-3 w-3" /> Enrolled
                      </span>
                    ) : (
                      <motion.button
                        onClick={(e) => { e.preventDefault(); handleEnroll(g.id); }}
                        disabled={enrolling === g.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center gap-1 rounded-md bg-accent-fuchsia/15 px-2 py-1 text-[10px] font-medium text-accent-fuchsia transition hover:bg-accent-fuchsia/25 hover:shadow-sm hover:shadow-accent-fuchsia/20"
                      >
                        {enrolling === g.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border border-accent-fuchsia border-t-transparent" />
                        ) : (
                          <><ArrowRight className="h-3 w-3" /> Enroll</>
                        )}
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Category chips */}
              <div className="mt-3 flex flex-wrap gap-1">
                {['DSA', 'System Design', 'SQL', 'Full Stack', 'AI/ML', 'DBMS', 'Aptitude'].map((c) => (
                  <motion.span
                    key={c}
                    whileHover={{ scale: 1.1, y: -1 }}
                    className="cursor-default rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500 transition-colors hover:border-accent-fuchsia/25 hover:bg-accent-fuchsia/5 hover:text-accent-fuchsia"
                  >
                    {c}
                  </motion.span>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 px-5 py-2.5">
              <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link href="/recommendations" className="group flex items-center justify-between text-xs font-medium text-accent-fuchsia transition hover:text-accent-fuchsia/80">
                  <span>Browse all goals</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
