'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Loader2,
  Map,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { ProgressInsights } from '@/types/analyzer';
import { cn } from '@/lib/utils';

export function ProgressInsightsTab() {
  const [insights, setInsights] = useState<ProgressInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ insights: ProgressInsights }>('/analyzer/progress', {
        method: 'POST',
        auth: true,
      });
      setInsights(r.insights);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  if (insights) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <section className="glass p-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-accent-violet">
            <Sparkles className="h-3.5 w-3.5" /> Powered by Gemini
          </div>
          <p className="text-base leading-relaxed text-zinc-200">{insights.summary}</p>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PanelList icon={ArrowUpRight} tint="emerald" title="Strengths" items={insights.strengths} emptyText="Solve more problems to surface strengths." />
          <PanelList icon={ArrowDownRight} tint="rose" title="Weaknesses" items={insights.weaknesses} emptyText="No clear weaknesses yet." />
        </div>

        <PanelList
          icon={AlertCircle}
          tint="amber"
          title="Learning gaps"
          items={insights.learning_gaps}
          emptyText="No major gaps spotted."
        />

        <section className="glass p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-violet">
            <Map className="h-3.5 w-3.5" /> Roadmap
          </div>
          {insights.roadmap.length === 0 ? (
            <p className="text-sm text-zinc-500">No roadmap yet.</p>
          ) : (
            <ol className="space-y-3">
              {insights.roadmap.map((w) => (
                <li key={w.week} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-violet">
                      Week {w.week}
                    </span>
                    <span className="text-sm font-medium text-zinc-100">{w.focus}</span>
                  </div>
                  {w.problems.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {w.problems.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-400">
                          <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-accent-violet/60" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SmallCard icon={CalendarDays} tint="violet" title="Daily goal" body={insights.daily_goal} />
          <SmallCard
            icon={TrendingUp}
            tint="emerald"
            title="Difficulty progression"
            body={insights.difficulty_progression}
          />
        </div>

        <div className="text-center">
          <button onClick={generate} disabled={loading} className="btn-ghost text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Regenerate</>}
          </button>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="glass p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent-violet" />
        <p className="mt-3 text-sm text-zinc-400">Reading your stats…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-6">
        <div className="flex items-start gap-2 text-sm text-accent-rose">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button onClick={generate} className="btn-ghost mt-4 text-sm">
          <Sparkles className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="glass p-10 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
        <Target className="h-7 w-7 text-accent-violet" />
      </div>
      <h3 className="mt-3 font-display text-xl font-semibold">Get your progress diagnosis</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Gemini reads your stats and topic mastery to surface strengths, gaps, and a focused 3-4 week
        roadmap.
      </p>
      <button onClick={generate} className="btn-primary mt-5">
        <Sparkles className="h-4 w-4" /> Analyze my progress
      </button>
    </div>
  );
}

function PanelList({
  icon: Icon,
  tint,
  title,
  items,
  emptyText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: 'emerald' | 'rose' | 'amber';
  title: string;
  items: string[];
  emptyText: string;
}) {
  const cls = {
    emerald: 'text-accent-emerald',
    rose: 'text-accent-rose',
    amber: 'text-amber-300',
  }[tint];
  return (
    <section className="glass p-5">
      <div className={cn('mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider', cls)}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-accent-violet/70" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SmallCard({
  icon: Icon,
  tint,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: 'violet' | 'emerald';
  title: string;
  body: string;
}) {
  const cls = {
    violet: 'border-accent-violet/30 bg-accent-violet/5 text-accent-violet',
    emerald: 'border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald',
  }[tint];
  return (
    <div className={cn('rounded-xl border p-4', cls)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-200">{body}</p>
    </div>
  );
}
