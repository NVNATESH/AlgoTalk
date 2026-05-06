'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Answer, Question, QuizResult } from '@/types/learning';
import { MCQSingle } from './questions/MCQSingle';
import { MCQMulti } from './questions/MCQMulti';
import { FillBlank } from './questions/FillBlank';
import { Match } from './questions/Match';
import { TrueFalse } from './questions/TrueFalse';

type AnswerMap = Record<string, Answer>;

export function QuizPlayer({
  questions,
  totalPoints,
  bestPercentage,
  onSubmit,
  onRetake,
  passThreshold = 70,
}: {
  questions: Question[];
  totalPoints: number;
  bestPercentage: number;
  onSubmit: (answers: AnswerMap) => Promise<QuizResult>;
  onRetake: () => void;
  passThreshold?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  const update = (id: string, ans: Answer | undefined) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (ans === undefined) delete next[id];
      else next[id] = ans;
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await onSubmit(answers);
      setResult(r);
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setAnswers({});
    setResult(null);
    setIdx(0);
    onRetake();
  };

  if (result) {
    return <QuizResultView result={result} questions={questions} onRetake={retake} />;
  }

  return (
    <div className="glass p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-500">
            Question {idx + 1} of {questions.length} ·{' '}
            <span className="text-zinc-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-accent-violet">
            {labelFor(q.type)}
          </div>
        </div>
        {bestPercentage > 0 && (
          <div className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-1 text-xs text-accent-emerald">
            Best: {bestPercentage}%
          </div>
        )}
      </div>

      {/* progress dots */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {questions.map((qq, i) => (
          <button
            key={qq.id}
            onClick={() => setIdx(i)}
            className={cn(
              'h-2 rounded-full transition-all',
              i === idx ? 'w-8 bg-accent-violet' : answers[qq.id] ? 'w-3 bg-accent-emerald' : 'w-3 bg-white/10 hover:bg-white/20'
            )}
            aria-label={`Question ${i + 1}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          <QuestionRenderer q={q} answer={answers[q.id]} onChange={(a) => update(q.id, a)} />
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/5 pt-5">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="btn-ghost text-sm disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-xs text-zinc-500">
          {answeredCount}/{questions.length} answered
        </div>
        {isLast ? (
          <button
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="btn-primary text-sm"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Submit <Sparkles className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
            className="btn-primary text-sm"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionRenderer({
  q,
  answer,
  onChange,
}: {
  q: Question;
  answer: Answer | undefined;
  onChange: (a: Answer | undefined) => void;
}) {
  switch (q.type) {
    case 'mcq_single':
      return <MCQSingle q={q} answer={answer as any} onChange={onChange} />;
    case 'mcq_multi':
      return <MCQMulti q={q} answer={answer as any} onChange={onChange} />;
    case 'fill_blank':
      return <FillBlank q={q} answer={answer as any} onChange={onChange} />;
    case 'match':
      return <Match q={q} answer={answer as any} onChange={onChange} />;
    case 'true_false':
      return <TrueFalse q={q} answer={answer as any} onChange={onChange} />;
  }
}

function labelFor(t: Question['type']): string {
  return {
    mcq_single: 'Multiple choice — pick one',
    mcq_multi: 'Multiple choice — pick all that apply',
    fill_blank: 'Fill in the blank',
    match: 'Match the following',
    true_false: 'True or false',
  }[t];
}

function QuizResultView({
  result,
  questions,
  onRetake,
}: {
  result: QuizResult;
  questions: Question[];
  onRetake: () => void;
}) {
  const byId = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.id, q] as const)),
    [questions]
  );

  return (
    <div className="glass p-6 md:p-8">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
          {result.passed ? (
            <CheckCircle2 className="h-10 w-10 text-accent-emerald" />
          ) : (
            <XCircle className="h-10 w-10 text-accent-rose" />
          )}
        </div>
        <h2 className="mt-4 font-display text-3xl font-bold">
          {result.passed ? '🎉 Passed!' : 'Almost there'}
        </h2>
        <p className="mt-1 text-zinc-400">
          {result.percentage}% — {result.score}/{result.maxScore} points · pass at{' '}
          {result.passThreshold}%
        </p>

        <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2 text-center">
          <ScoreChip label="Correct" value={`${result.results.filter((r) => r.correct).length}/${result.results.length}`} />
          <ScoreChip label="XP earned" value={`+${result.xpAwarded}`} highlight />
          <ScoreChip label="Best" value={`${result.bestPercentage}%`} />
        </div>

        {result.firstPass && (
          <div className="mx-auto mt-4 inline-flex items-center gap-1 rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-1 text-xs font-medium text-accent-emerald">
            <Sparkles className="h-3 w-3" /> First-time pass bonus included
          </div>
        )}
      </motion.div>

      <div className="mt-8 space-y-3">
        <h3 className="font-display text-lg font-semibold">Per-question feedback</h3>
        {result.results.map((r, i) => {
          const q = byId[r.id];
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'rounded-xl border p-4',
                r.correct
                  ? 'border-accent-emerald/30 bg-accent-emerald/5'
                  : 'border-accent-rose/30 bg-accent-rose/5'
              )}
            >
              <div className="flex items-start gap-3">
                {r.correct ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-emerald" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent-rose" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-500">
                      {labelFor(q?.type as any) ?? r.type}
                    </span>
                    <span className="font-mono text-xs text-zinc-400">
                      {r.pointsEarned}/{r.pointsAvailable} pts
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-zinc-200">{q?.prompt ?? '(question missing)'}</div>
                  <ExpectedReveal r={r} q={q} />
                  {r.explanation && (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      <span className="font-medium text-zinc-300">Explanation: </span>
                      {r.explanation}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button onClick={onRetake} className="btn-primary">
          <RotateCcw className="h-4 w-4" /> Retake quiz
        </button>
      </div>
    </div>
  );
}

function ScoreChip({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2',
        highlight ? 'border-accent-violet/30 bg-accent-violet/10' : 'border-white/10 bg-white/5'
      )}
    >
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function ExpectedReveal({ r, q }: { r: any; q: Question | undefined }) {
  if (r.correct || !q || !r.expected) return null;
  switch (q.type) {
    case 'mcq_single':
      return (
        <p className="mt-1.5 text-xs text-zinc-400">
          <span className="text-zinc-300">Correct: </span>
          <span className="text-accent-emerald">{r.expected.correctOption}</span>
        </p>
      );
    case 'mcq_multi':
      return (
        <p className="mt-1.5 text-xs text-zinc-400">
          <span className="text-zinc-300">Correct: </span>
          <span className="text-accent-emerald">
            {(r.expected.correctOptions ?? []).join(' · ')}
          </span>
        </p>
      );
    case 'fill_blank':
      return (
        <p className="mt-1.5 text-xs text-zinc-400">
          <span className="text-zinc-300">Accepted: </span>
          <span className="font-mono text-accent-emerald">
            {(r.expected.acceptedAnswers ?? []).map((b: string) => b.split('|')[0]).join(' / ')}
          </span>
        </p>
      );
    case 'match':
      return (
        <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-400">
          {(r.expected.pairs ?? []).map((p: any, i: number) => (
            <li key={i}>
              <span className="text-zinc-200">{p.left}</span> →{' '}
              <span className="text-accent-emerald">{p.right}</span>
            </li>
          ))}
        </ul>
      );
    case 'true_false':
      return (
        <p className="mt-1.5 text-xs text-zinc-400">
          <span className="text-zinc-300">Correct: </span>
          <span className="text-accent-emerald">{r.expected.correct ? 'True' : 'False'}</span>
        </p>
      );
  }
}
