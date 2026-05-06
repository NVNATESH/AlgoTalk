'use client';

import { Check } from 'lucide-react';
import { Markdown } from '../Markdown';
import { cn } from '@/lib/utils';
import type { MCQMultiQuestion } from '@/types/learning';

export function MCQMulti({
  q,
  answer,
  onChange,
}: {
  q: MCQMultiQuestion;
  answer: { type: 'mcq_multi'; choices: number[] } | undefined;
  onChange: (a: { type: 'mcq_multi'; choices: number[] }) => void;
}) {
  const selected = new Set(answer?.choices ?? []);
  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange({ type: 'mcq_multi', choices: [...next].sort((a, b) => a - b) });
  };

  return (
    <div>
      <Markdown>{q.prompt}</Markdown>
      <p className="mt-1 text-xs text-zinc-500">Select all that apply.</p>
      <div className="mt-4 space-y-2">
        {q.options.map((opt, i) => {
          const sel = selected.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition',
                sel
                  ? 'border-accent-violet/60 bg-accent-violet/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition',
                  sel ? 'border-accent-violet bg-accent-violet' : 'border-white/20'
                )}
              >
                {sel && <Check className="h-3.5 w-3.5 text-white" />}
              </span>
              <span className="text-sm text-zinc-200">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
