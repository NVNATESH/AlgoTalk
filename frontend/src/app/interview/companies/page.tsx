'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Users,
  BookOpen,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useGoals } from '@/stores/goalStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const COMPANIES = [
  { name: 'Google', icon: '🔍', color: 'from-blue-500/30 to-green-500/10', borderHover: 'hover:border-blue-500/40' },
  { name: 'Amazon', icon: '📦', color: 'from-orange-500/30 to-amber-500/10', borderHover: 'hover:border-orange-500/40' },
  { name: 'Microsoft', icon: '🪟', color: 'from-cyan-500/30 to-blue-500/10', borderHover: 'hover:border-cyan-500/40' },
  { name: 'Atlassian', icon: '🔷', color: 'from-blue-600/30 to-indigo-500/10', borderHover: 'hover:border-blue-600/40' },
  { name: 'Adobe', icon: '🎨', color: 'from-red-500/30 to-pink-500/10', borderHover: 'hover:border-red-500/40' },
  { name: 'Flipkart', icon: '🛒', color: 'from-yellow-500/30 to-blue-500/10', borderHover: 'hover:border-yellow-500/40' },
  { name: 'PayPal', icon: '💳', color: 'from-blue-600/30 to-sky-500/10', borderHover: 'hover:border-blue-600/40' },
  { name: 'TCS', icon: '🏢', color: 'from-gray-500/30 to-blue-500/10', borderHover: 'hover:border-gray-500/40' },
  { name: 'Infosys', icon: '🏛️', color: 'from-purple-500/30 to-blue-500/10', borderHover: 'hover:border-purple-500/40' },
  { name: 'Zoho', icon: '📧', color: 'from-red-600/30 to-orange-500/10', borderHover: 'hover:border-red-600/40' },
  { name: 'Wipro', icon: '🌿', color: 'from-green-600/30 to-teal-500/10', borderHover: 'hover:border-green-600/40' },
  { name: 'Accenture', icon: '⚡', color: 'from-violet-500/30 to-purple-500/10', borderHover: 'hover:border-violet-500/40' },
];

export default function InterviewCompaniesPage() {
  const { recommended, fetchRecommended, enrollInGoal } = useGoals();
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommended({ goalType: 'company_prep' });
  }, [fetchRecommended]);

  const handleEnroll = async (templateId: string) => {
    setEnrolling(templateId);
    try {
      await enrollInGoal(templateId, { deadlineDays: 45 });
      toast.success('Company prep goal added!');
    } catch {
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <AppShell>
      <header className="mb-8">
        <Link href="/interview" className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3 w-3" /> Back to interviews
        </Link>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
            <Building2 className="h-3 w-3" /> Company-Wise
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">🏢 Interview Preparation</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Choose a company to start a dedicated preparation path — DSA, system design, HR, and mock interviews.
          </p>
        </motion.div>
      </header>

      {/* Company Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4">
        {COMPANIES.map((c, i) => {
          const template = recommended.find(g => g.companyTarget?.toLowerCase() === c.name.toLowerCase());
          return (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.25) }}
            >
              <div className={cn(
                'glass group relative flex flex-col items-center p-6 text-center transition',
                c.borderHover
              )}>
                {/* Gradient bg */}
                <div className={cn('pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-40', c.color)} />

                <div className="relative z-10">
                  <div className="mb-3 text-4xl">{c.icon}</div>
                  <h3 className="font-display text-lg font-bold text-zinc-100">{c.name}</h3>

                  {template && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {template.modules.length} modules</span>
                    </div>
                  )}

                  <div className="mt-4">
                    {template ? (
                      template.enrolled ? (
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 px-4 py-2 text-xs font-medium text-accent-emerald transition hover:bg-accent-emerald/20"
                        >
                          ✅ Enrolled
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleEnroll(template.id)}
                          disabled={enrolling === template.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-violet to-accent-fuchsia px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-accent-violet/20 transition hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                          {enrolling === template.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Start Prep
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] text-zinc-600">Coming soon</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* What's included */}
      <section className="mt-12">
        <h2 className="mb-4 font-display text-xl font-bold">What&apos;s included in each prep</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: '📊', title: 'DSA Patterns', desc: 'Most asked problems & patterns' },
            { icon: '🏗️', title: 'System Design', desc: 'Company-specific design rounds' },
            { icon: '🎤', title: 'Behavioral', desc: 'STAR stories & culture fit' },
            { icon: '🎯', title: 'Mock Interviews', desc: 'AI-powered mock sessions' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="glass p-4"
            >
              <div className="mb-2 text-2xl">{item.icon}</div>
              <h3 className="font-display text-sm font-semibold">{item.title}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
