'use client';

import { Markdown } from '../Markdown';
import { cn } from '@/lib/utils';
import type { MatchQuestion } from '@/types/learning';

export function Match({
  q,
  answer,
  onChange,
}: {
  q: MatchQuestion;
  answer: { type: 'match'; pairs: Array<{ left: string; right: string }> } | undefined;
  onChange: (
    a: { type: 'match'; pairs: Array<{ left: string; right: string }> } | undefined
  ) => void;
}) {
  // Map left → currently chosen right (or '')
  const chosen: Record<string, string> = Object.fromEntries(
    q.pairs.map((p) => [p.left, answer?.pairs.find((ap) => ap.left === p.left)?.right ?? ''])
  );

  const usedRights = new Set(Object.values(chosen).filter(Boolean));

  const setMatch = (left: string, right: string) => {
    const updated = { ...chosen };
    updated[left] = right;
    const pairs = q.pairs.map((p) => ({ left: p.left, right: updated[p.left] || '' })).filter(
      (p) => p.right
    );
    if (pairs.length === 0) onChange(undefined);
    else onChange({ type: 'match', pairs });
  };

  return (
    <div>
      <Markdown>{q.prompt}</Markdown>
      <p className="mt-1 text-xs text-zinc-500">Pair each item on the left with one on the right.</p>
      <div className="mt-4 space-y-2">
        {q.pairs.map((p, i) => (
          <div
            key={p.left}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-2 sm:w-1/2">
              <span className="font-mono text-xs text-zinc-500">{i + 1}.</span>
              <span className="text-sm text-zinc-100">{p.left}</span>
            </div>
            <span className="hidden text-zinc-600 sm:inline">→</span>
            <div className="flex flex-wrap gap-1.5 sm:flex-1">
              {q.rights.map((r) => {
                const isChosen = chosen[p.left] === r;
                const usedElsewhere = !isChosen && usedRights.has(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setMatch(p.left, isChosen ? '' : r)}
                    disabled={usedElsewhere}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs transition',
                      isChosen
                        ? 'border-accent-violet bg-accent-violet/20 text-white'
                        : usedElsewhere
                          ? 'border-white/5 bg-white/[0.02] text-zinc-600'
                          : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                    )}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
