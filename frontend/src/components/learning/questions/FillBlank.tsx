'use client';

import { Markdown } from '../Markdown';
import type { FillBlankQuestion } from '@/types/learning';

export function FillBlank({
  q,
  answer,
  onChange,
}: {
  q: FillBlankQuestion;
  answer: { type: 'fill_blank'; values: string[] } | undefined;
  onChange: (a: { type: 'fill_blank'; values: string[] } | undefined) => void;
}) {
  const values = answer?.values ?? new Array(q.blanks.length).fill('');

  const updateAt = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    const allEmpty = next.every((s) => !s.trim());
    if (allEmpty) onChange(undefined);
    else onChange({ type: 'fill_blank', values: next });
  };

  return (
    <div>
      <Markdown>{q.prompt}</Markdown>
      <div className="mt-4 space-y-2">
        {q.blanks.map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {q.blanks.length > 1 && (
              <span className="font-mono text-xs text-zinc-500">#{i + 1}</span>
            )}
            <input
              type="text"
              value={values[i] ?? ''}
              onChange={(e) => updateAt(i, e.target.value)}
              placeholder="Your answer..."
              className="input-base font-mono"
              autoFocus={i === 0}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Spelling and capitalization are flexible — focus on the right concept.
      </p>
    </div>
  );
}
