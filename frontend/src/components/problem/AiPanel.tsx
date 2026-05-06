'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Code2,
  Lightbulb,
  Loader2,
  RefreshCcw,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Markdown } from '@/components/learning/Markdown';
import { api, ApiError } from '@/lib/api';
import type { Language } from '@/types/problem';
import { cn } from '@/lib/utils';

type Mode = 'idle' | 'hint' | 'explain' | 'explain-code' | 'optimize';

interface OptimizeResult {
  currentComplexity: { time: string; space: string };
  targetComplexity: { time: string; space: string };
  suggestions: string[];
  optimizedCode: string;
}

export function AiPanel({
  slug,
  language,
  code,
  onApplyOptimized,
  onClose,
}: {
  slug: string;
  language: Language;
  code: string;
  onApplyOptimized: (optimizedCode: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('idle');
  const [loading, setLoading] = useState<Mode | null>(null);
  const [hint, setHint] = useState('');
  const [explanation, setExplanation] = useState('');
  const [optimize, setOptimize] = useState<OptimizeResult | null>(null);

  const run = async (m: Mode) => {
    setLoading(m);
    setMode(m);
    try {
      if (m === 'hint') {
        const r = await api<{ hint: string }>('/ai/hint', {
          method: 'POST',
          auth: true,
          body: { slug, code: code.trim() ? code : undefined },
        });
        setHint(r.hint);
      } else if (m === 'explain') {
        const r = await api<{ explanation: string }>('/ai/explain', {
          method: 'POST',
          auth: true,
          body: { slug },
        });
        setExplanation(r.explanation);
      } else if (m === 'explain-code') {
        if (!code.trim()) {
          toast.error('Write some code first.');
          setMode('idle');
          return;
        }
        const r = await api<{ explanation: string }>('/ai/explain-code', {
          method: 'POST',
          auth: true,
          body: { slug, code, language },
        });
        setExplanation(r.explanation);
      } else if (m === 'optimize') {
        if (!code.trim()) {
          toast.error('Write some code first.');
          setMode('idle');
          return;
        }
        const r = await api<OptimizeResult>('/ai/optimize', {
          method: 'POST',
          auth: true,
          body: { slug, code, language },
        });
        setOptimize(r);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'AI request failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg-elevated/80 backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-accent-violet" /> AI Helper
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          aria-label="Close AI panel"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-1.5 border-b border-white/5 px-3 py-3">
        <ActionButton
          icon={Lightbulb}
          label="Get Hint"
          loading={loading === 'hint'}
          onClick={() => run('hint')}
        />
        <ActionButton
          icon={Bot}
          label="Explain Problem"
          loading={loading === 'explain'}
          onClick={() => run('explain')}
        />
        <ActionButton
          icon={Code2}
          label="Explain My Code"
          loading={loading === 'explain-code'}
          onClick={() => run('explain-code')}
        />
        <ActionButton
          icon={Zap}
          label="Optimize"
          loading={loading === 'optimize'}
          onClick={() => run('optimize')}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {mode === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full flex-col items-center justify-center text-center"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
                <Sparkles className="h-6 w-6 text-accent-violet" />
              </div>
              <h3 className="font-display text-base font-semibold">Stuck or curious?</h3>
              <p className="mt-1 max-w-[260px] text-xs text-zinc-400">
                Pick an action above. Hints are nudges, not solutions.
              </p>
            </motion.div>
          )}

          {mode === 'hint' && (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <SectionTitle icon={Lightbulb} label="Hint" />
              {loading === 'hint' ? (
                <SectionLoading />
              ) : (
                <Markdown>{hint}</Markdown>
              )}
              {hint && !loading && (
                <button onClick={() => run('hint')} className="btn-ghost mt-3 text-xs">
                  <RefreshCcw className="h-3 w-3" /> Another hint
                </button>
              )}
            </motion.div>
          )}

          {(mode === 'explain' || mode === 'explain-code') && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <SectionTitle
                icon={mode === 'explain' ? Bot : Code2}
                label={mode === 'explain' ? 'Problem Explanation' : 'Code Walkthrough'}
              />
              {loading === mode ? (
                <SectionLoading />
              ) : (
                <Markdown>{explanation}</Markdown>
              )}
            </motion.div>
          )}

          {mode === 'optimize' && (
            <motion.div
              key="optimize"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <SectionTitle icon={Zap} label="Optimization analysis" />
              {loading === 'optimize' ? (
                <SectionLoading />
              ) : optimize ? (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <ComplexityCard
                      label="Current"
                      time={optimize.currentComplexity.time}
                      space={optimize.currentComplexity.space}
                      tone="amber"
                    />
                    <ComplexityCard
                      label="Target"
                      time={optimize.targetComplexity.time}
                      space={optimize.targetComplexity.space}
                      tone="emerald"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Suggestions
                    </div>
                    <ul className="space-y-1.5">
                      {optimize.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-300">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent-violet" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {optimize.optimizedCode && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Optimized version
                        </span>
                        <button
                          onClick={() => onApplyOptimized(optimize.optimizedCode)}
                          className="btn-primary text-xs"
                        >
                          <Wand2 className="h-3 w-3" /> Apply to editor
                        </button>
                      </div>
                      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-bg-card/80 p-3 font-mono text-xs leading-relaxed text-zinc-200">
                        <code>{optimize.optimizedCode}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-accent-violet/40 hover:bg-white/10 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-violet" />
      ) : (
        <Icon className="h-3.5 w-3.5 text-accent-violet" />
      )}
      {label}
    </button>
  );
}

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-violet">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
  );
}

function SectionLoading() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-full animate-pulse rounded bg-white/5" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-white/5" />
      <div className="h-3 w-4/6 animate-pulse rounded bg-white/5" />
    </div>
  );
}

function ComplexityCard({
  label,
  time,
  space,
  tone,
}: {
  label: string;
  time: string;
  space: string;
  tone: 'amber' | 'emerald';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        tone === 'amber'
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-accent-emerald/30 bg-accent-emerald/5'
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-zinc-100">
        {time}
      </div>
      <div className="font-mono text-xs text-zinc-400">space {space}</div>
    </div>
  );
}
