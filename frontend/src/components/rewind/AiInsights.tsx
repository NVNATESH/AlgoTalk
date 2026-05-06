'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Markdown } from '@/components/learning/Markdown';
import type { RewindInsights } from '@/types/rewind';
import { cn } from '@/lib/utils';

export function AiInsightsPanel({
  insights,
  loading,
  error,
  onGenerate,
}: {
  insights: RewindInsights | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  if (insights) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass overflow-hidden p-6"
      >
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-accent-violet">
          <Sparkles className="h-3.5 w-3.5" /> AI year-in-review · powered by Gemini
        </div>

        <div className="space-y-5">
          <div>
            <Markdown>{insights.narrative}</Markdown>
          </div>

          {insights.highlights.length > 0 && (
            <div>
              <SectionLabel icon={Sparkles} label="Highlights" />
              <ul className="mt-2 space-y-1.5">
                {insights.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-violet" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InsightCard
              icon={ArrowUpRight}
              tint="emerald"
              title="Growth period"
              body={insights.growthPeriod}
            />
            <InsightCard
              icon={TrendingUp}
              tint="violet"
              title="Most productive months"
              body={insights.productiveMonths}
            />
            <InsightCard icon={Scale} tint="cyan" title="H1 vs H2" body={insights.h1VsH2} />
            {insights.decline ? (
              <InsightCard
                icon={ArrowDownRight}
                tint="amber"
                title="Quiet period"
                body={insights.decline}
              />
            ) : (
              <InsightCard
                icon={ArrowUpRight}
                tint="emerald"
                title="Consistency"
                body="No major drop-offs detected — you stayed pretty consistent."
              />
            )}
          </div>

          {insights.improvementAreas.length > 0 && (
            <div className="rounded-2xl border border-accent-violet/20 bg-accent-violet/5 p-4">
              <SectionLabel icon={Target} label="What to focus on next year" />
              <ul className="mt-2 space-y-1.5 text-sm">
                {insights.improvementAreas.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-zinc-200">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent-violet" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.section>
    );
  }

  if (loading) {
    return (
      <section className="glass p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent-violet" />
        <p className="mt-3 text-sm text-zinc-400">
          Asking Gemini to analyze your year…
        </p>
        <p className="mt-1 text-xs text-zinc-600">This usually takes 5–10 seconds.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="glass p-6">
        <div className="flex items-start gap-2 text-sm text-accent-rose">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button onClick={onGenerate} className="btn-ghost mt-4 text-sm">
          <Sparkles className="h-4 w-4" /> Try again
        </button>
      </section>
    );
  }

  return (
    <section className="glass p-8 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
        <Sparkles className="h-6 w-6 text-accent-violet" />
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold">Get your AI year-in-review</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Gemini reads your monthly stats and writes a personalized summary, growth analysis, and
        suggestions for next year.
      </p>
      <button onClick={onGenerate} className="btn-primary mt-5">
        <Sparkles className="h-4 w-4" /> Generate insights
      </button>
    </section>
  );
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      <Icon className="h-3 w-3" /> {label}
    </div>
  );
}

function InsightCard({
  icon: Icon,
  tint,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: 'emerald' | 'violet' | 'amber' | 'cyan';
  title: string;
  body: string;
}) {
  const cls = {
    emerald: 'border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald',
    violet: 'border-accent-violet/30 bg-accent-violet/5 text-accent-violet',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    cyan: 'border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan',
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
