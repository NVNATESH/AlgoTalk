'use client';

import { Markdown } from '../Markdown';
import { cn } from '@/lib/utils';
import type { TrueFalseQuestion } from '@/types/learning';

export function TrueFalse({
  q,
  answer,
  onChange,
}: {
  q: TrueFalseQuestion;
  answer: { type: 'true_false'; value: boolean } | undefined;
  onChange: (a: { type: 'true_false'; value: boolean }) => void;
}) {
  return (
    <div>
      <Markdown>{q.prompt}</Markdown>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[true, false].map((v) => {
          const sel = answer?.value === v;
          return (
            <button
              key={String(v)}
              onClick={() => onChange({ type: 'true_false', value: v })}
              className={cn(
                'rounded-xl border py-4 text-lg font-display font-semibold transition',
                sel
                  ? v
                    ? 'border-accent-emerald/60 bg-accent-emerald/10 text-accent-emerald'
                    : 'border-accent-rose/60 bg-accent-rose/10 text-accent-rose'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
              )}
            >
              {v ? '✓ True' : '✗ False'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
