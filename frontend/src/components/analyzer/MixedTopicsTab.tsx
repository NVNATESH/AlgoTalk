'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronRight,
  Clock,
  Layers,
  Loader2,
  Sparkles,
  Target,
  Trophy,
  Wand2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  MixedDifficulty,
  MixedMode,
  MixedPracticeResult,
} from '@/types/mixedPractice';

const COMMON_TOPICS = [
  'array',
  'string',
  'hash-table',
  'dynamic-programming',
  'tree',
  'graph',
  'binary-search',
  'two-pointers',
  'sliding-window',
  'greedy',
  'backtracking',
  'recursion',
  'math',
  'sorting',
  'heap',
  'stack',
  'queue',
  'linked-list',
  'bit-manipulation',
  'segment-tree',
];

const ALL_DIFFICULTY: MixedDifficulty[] = ['Easy', 'Medium', 'Hard'];

/**
 * Mixed-Topic Question Practice — picks problems from the user's catalog that
 * span the chosen topic combo with adaptive difficulty + weak-topic bias.
 * Lives inside the Analyzer tab (per #9).
 */
export function MixedTopicsTab() {
  const [topics, setTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<MixedDifficulty[]>(['Easy', 'Medium']);
  const [count, setCount] = useState(8);
  const [mode, setMode] = useState<MixedMode>('practice');
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MixedPracticeResult | null>(null);

  const toggleTopic = (t: string) =>
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 6)));

  const toggleDifficulty = (d: MixedDifficulty) =>
    setDifficulty((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const addCustom = () => {
    const t = customTopic.trim().toLowerCase().replace(/\s+/g, '-');
    if (!t || topics.includes(t)) return;
    setTopics((prev) => [...prev, t].slice(0, 6));
    setCustomTopic('');
  };

  const generate = async () => {
    if (topics.length === 0) {
      toast.error('Pick at least one topic');
      return;
    }
    setLoading(true);
    try {
      const r = await api<MixedPracticeResult>('/mixed-practice/generate', {
        method: 'POST',
        auth: true,
        body: {
          topics,
          difficulty,
          count,
          mode,
          durationMinutes: mode !== 'practice' ? durationMinutes : undefined,
        },
      });
      setResult(r);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not generate set');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="glass p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
          <Layers className="h-3 w-3" /> Mixed-topic practice
        </div>
        <h2 className="mt-1 font-display text-xl font-semibold">
          Combine topics. Drill weak spots. Train like a contest.
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Pick 1–6 topics. The AI mixes problems across them, biases toward your weak topics,
          and lays out a sequenced plan. Reuses your analyzer's mastery profile.
        </p>
      </header>

      {/* Topic picker */}
      <section className="glass p-5">
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
          <Target className="h-4 w-4 text-accent-violet" /> Topics ({topics.length}/6)
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TOPICS.map((t) => (
            <TopicChip
              key={t}
              topic={t}
              active={topics.includes(t)}
              onClick={() => toggleTopic(t)}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add your own (e.g. monotonic-queue)…"
            className="input-base flex-1 text-sm"
          />
          <button onClick={addCustom} className="btn-ghost text-sm" disabled={!customTopic.trim()}>
            Add
          </button>
        </div>
        {topics.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Selected:</span>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => toggleTopic(t)}
                className="inline-flex items-center gap-1 rounded-full border border-accent-violet/40 bg-accent-violet/10 px-2 py-0.5 text-[11px] text-accent-violet hover:bg-accent-violet/20"
              >
                {t} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Filters */}
      <section className="glass grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Difficulty
          </label>
          <div className="mt-2 flex gap-1.5">
            {ALL_DIFFICULTY.map((d) => (
              <button
                key={d}
                onClick={() => toggleDifficulty(d)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  difficulty.includes(d)
                    ? d === 'Easy'
                      ? 'border-accent-emerald/60 bg-accent-emerald/15 text-accent-emerald'
                      : d === 'Medium'
                        ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                        : 'border-accent-rose/60 bg-accent-rose/15 text-accent-rose'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Mode
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(['practice', 'timed', 'contest'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium capitalize transition',
                  mode === m
                    ? 'border-accent-violet/60 bg-accent-violet/15 text-accent-violet'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                )}
              >
                {m === 'practice' ? <Sparkles className="h-3 w-3" /> : m === 'timed' ? <Clock className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
                {m}
              </button>
            ))}
          </div>
          {mode !== 'practice' && (
            <input
              type="number"
              min={15}
              max={360}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(15, Math.min(360, Number(e.target.value))))}
              className="input-base mt-2 w-32 text-sm"
              placeholder="Minutes"
            />
          )}
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Number of problems
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="range"
              min={3}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 accent-accent-violet"
            />
            <span className="w-8 text-right font-mono text-sm font-semibold tabular-nums">
              {count}
            </span>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end">
        <button
          onClick={generate}
          disabled={loading || topics.length === 0}
          className="btn-primary text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Generate mixed set
            </>
          )}
        </button>
      </div>

      {result && <MixedPracticeResultView result={result} />}
    </div>
  );
}

function TopicChip({ topic, active, onClick }: { topic: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
        active
          ? 'border-accent-violet/60 bg-accent-violet/15 text-accent-violet'
          : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
      )}
    >
      {topic}
    </button>
  );
}

function MixedPracticeResultView({ result }: { result: MixedPracticeResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <section className="glass p-5">
        <h3 className="font-display text-base font-semibold">Why this set</h3>
        <p className="mt-1 text-sm text-zinc-300">{result.insights.reasoning}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <Detail label="Difficulty curve" value={result.insights.difficulty_curve} />
          <Detail label="Weak-topic focus" value={result.insights.weak_topic_focus} />
        </div>
        <div className="mt-3 border-t border-white/5 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Expected outcome
          </span>
          <p className="mt-1 text-sm text-zinc-300">{result.insights.expected_outcome}</p>
        </div>
      </section>

      <section className="glass p-5">
        <h3 className="font-display text-base font-semibold">
          {result.problems.length} problem{result.problems.length === 1 ? '' : 's'}
        </h3>
        <ul className="mt-3 space-y-2">
          {result.problems.map((p, i) => (
            <motion.li
              key={p.slug}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.025, 0.25) }}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <span className="font-mono text-sm font-semibold tabular-nums text-zinc-500">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Link
                href={`/solve/${p.slug}`}
                className="min-w-0 flex-1 hover:text-accent-violet"
              >
                <div className="truncate text-sm font-medium">{p.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
                  {p.tags.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-full bg-white/5 px-1.5 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
                  p.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                  p.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                  p.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                )}
              >
                {p.difficulty}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
            </motion.li>
          ))}
        </ul>
      </section>

      {result.insights.daily_plan.length > 0 && (
        <section className="glass p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Calendar className="h-4 w-4 text-accent-violet" /> Daily plan
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {result.insights.daily_plan.map((d) => (
              <div key={d.day} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
                  Day {d.day}
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-200">{d.focus}</div>
                <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                  {d.problems.map((s) => (
                    <li key={s} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-zinc-600" />
                      <Link href={`/solve/${s}`} className="truncate hover:text-accent-violet">
                        {s}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {result.weakTopicCoverage.length > 0 && (
        <section className="glass p-5">
          <h3 className="font-display text-base font-semibold">Weak-topic coverage</h3>
          <ul className="mt-3 space-y-1.5">
            {result.weakTopicCoverage.map((c) => (
              <li
                key={c.topic}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs"
              >
                <span className="text-zinc-300">{c.topic}</span>
                <span className="font-mono tabular-nums text-accent-emerald">
                  {c.problems} problem{c.problems === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </motion.div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}
