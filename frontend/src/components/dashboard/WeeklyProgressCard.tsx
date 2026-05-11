'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Target, Trophy, Flame, Award, Download } from 'lucide-react';
import { api } from '@/lib/api';
import type { DashboardReport } from '@/types/report';

export function WeeklyProgressCard() {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ report: DashboardReport }>('/reports/dashboard', { auth: true })
      .then((r) => setReport(r.report))
      .catch(() => {}) // silently fail
      .finally(() => setLoading(false));
  }, []);

  if (loading || !report) return null;

  const stats = [
    { icon: Target, label: 'Active Goals', value: report.summary.activeGoals, color: 'text-accent-violet' },
    { icon: Trophy, label: 'Completed', value: report.summary.completedGoals, color: 'text-accent-emerald' },
    { icon: Clock, label: 'Hours Logged', value: `${report.summary.totalHoursLogged}h`, color: 'text-accent-cyan' },
    { icon: Flame, label: 'Best Streak', value: `${report.summary.bestStreak}d`, color: 'text-accent-amber' },
    { icon: Award, label: 'Badges', value: report.summary.badgesEarned, color: 'text-accent-fuchsia' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass mb-4 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-violet" /> Weekly Progress
        </h3>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-medium">
            {report.user.rank}
          </span>
          <span>{report.user.xp} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-3">
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <div>
              <div className="font-display text-lg font-bold tabular-nums">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {report.upcomingDeadlines.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <h4 className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">⚠️ Upcoming Deadlines</h4>
          <div className="space-y-1.5">
            {report.upcomingDeadlines.slice(0, 3).map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{d.name}</span>
                <span className={`font-mono tabular-nums ${d.daysLeft <= 3 ? 'text-accent-rose' : 'text-zinc-500'}`}>
                  {d.daysLeft}d left · {d.progress}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}
