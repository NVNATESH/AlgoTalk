'use client';

import { Markdown } from '../Markdown';
import { cn } from '@/lib/utils';
import type { MCQSingleQuestion } from '@/types/learning';

export function MCQSingle({
  q,
  answer,
  onChange,
}: {
  q: MCQSingleQuestion;
  answer: { type: 'mcq_single'; choice: number } | undefined;
  onChange: (a: { type: 'mcq_single'; choice: number }) => void;
}) {
  return (
    <div>
      <Markdown>{q.prompt}</Markdown>
      <div className="mt-4 space-y-2">
        {q.options.map((opt, i) => {
          const selected = answer?.choice === i;
          return (
            <button
              key={i}
              onClick={() => onChange({ type: 'mcq_single', choice: i })}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition',
                selected
                  ? 'border-accent-violet/60 bg-accent-violet/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  selected
                    ? 'border-accent-violet bg-accent-violet text-white'
                    : 'border-white/20 text-zinc-400'
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm text-zinc-200">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
