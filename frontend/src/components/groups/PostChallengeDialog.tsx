'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/auth/Field';
import { api, ApiError } from '@/lib/api';
import type { Challenge, ChallengeType } from '@/types/group';
import type { ProblemSummary } from '@/types/problem';
import { cn } from '@/lib/utils';

const codingSchema = z.object({
  type: z.literal('coding'),
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  points: z.coerce.number().int().min(1).max(1000),
  problemSlug: z.string().min(1).optional(),
  externalUrl: z.string().url().optional().or(z.literal('')),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
});

const aptitudeSchema = z.object({
  type: z.literal('aptitude'),
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  points: z.coerce.number().int().min(1).max(1000),
  optionA: z.string().min(1).max(300),
  optionB: z.string().min(1).max(300),
  optionC: z.string().min(1).max(300),
  optionD: z.string().min(1).max(300),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
});

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  onPosted: (c: Challenge) => void;
}

export function PostChallengeDialog({ open, onClose, groupId, onPosted }: Props) {
  const [type, setType] = useState<ChallengeType>('coding');
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Post a 24h challenge">
      <p className="-mt-2 mb-4 text-sm text-zinc-400">
        Challenges expire in 24 hours. Group members earn points when they solve / answer
        correctly.
      </p>
      <div className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        <TypeBtn active={type === 'coding'} onClick={() => setType('coding')}>
          💻 Coding
        </TypeBtn>
        <TypeBtn active={type === 'aptitude'} onClick={() => setType('aptitude')}>
          🧠 Aptitude
        </TypeBtn>
      </div>
      {type === 'coding' ? (
        <CodingForm groupId={groupId} onPosted={onPosted} onClose={onClose} />
      ) : (
        <AptitudeForm groupId={groupId} onPosted={onPosted} onClose={onClose} />
      )}
    </Modal>
  );
}

function TypeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition',
        active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
      )}
    >
      {children}
    </button>
  );
}

function CodingForm({
  groupId,
  onPosted,
  onClose,
}: {
  groupId: string;
  onPosted: (c: Challenge) => void;
  onClose: () => void;
}) {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof codingSchema>>({
    defaultValues: { type: 'coding', points: 20 },
  });

  // load internal problems
  useEffect(() => {
    api<{ problems: ProblemSummary[] }>('/problems', { auth: true })
      .then((r) => setProblems(r.problems))
      .catch(() => setProblems([]));
  }, []);

  const slug = watch('problemSlug');

  const onSubmit = async (raw: z.infer<typeof codingSchema>) => {
    const parsed = codingSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }
    setSubmitting(true);
    try {
      const body: any = {
        type: 'coding',
        title: parsed.data.title,
        description: parsed.data.description || undefined,
        points: parsed.data.points,
      };
      if (parsed.data.problemSlug) body.problemSlug = parsed.data.problemSlug;
      if (parsed.data.externalUrl) body.externalUrl = parsed.data.externalUrl;
      if (parsed.data.difficulty) body.difficulty = parsed.data.difficulty;
      const r = await api<{ challenge: Challenge }>(`/groups/${groupId}/challenges`, {
        method: 'POST',
        auth: true,
        body,
      });
      toast.success('Challenge posted!');
      onPosted(r.challenge);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Title" {...register('title')} error={errors.title?.message} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">
          Description <span className="text-zinc-500">(optional)</span>
        </label>
        <textarea
          {...register('description')}
          rows={2}
          placeholder="Tips, hints, or context..."
          className="input-base resize-y"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Pick from LearnHub problems
        </label>
        <div className="grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
          {problems.length === 0 ? (
            <p className="p-3 text-xs text-zinc-500">Loading problems…</p>
          ) : (
            problems.map((p) => (
              <button
                type="button"
                key={p.slug}
                onClick={() => setValue('problemSlug', p.slug)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition',
                  slug === p.slug
                    ? 'border-accent-violet/60 bg-accent-violet/10 text-white'
                    : 'border-white/5 bg-white/[0.02] text-zinc-300 hover:bg-white/5'
                )}
              >
                <span className="truncate">{p.title}</span>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
                    p.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                    p.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                    p.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                  )}
                >
                  {p.difficulty}
                </span>
              </button>
            ))
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Members who get an Accepted submission within 24h earn the points.
        </p>
      </div>

      <div className="text-center text-xs text-zinc-500">— or —</div>

      <Field
        label="External URL"
        placeholder="https://leetcode.com/problems/..."
        {...register('externalUrl')}
        error={errors.externalUrl?.message}
        hint="External-platform auto-verification is coming. For now this is just a link."
      />

      <Field
        label="Points"
        type="number"
        min={1}
        max={1000}
        {...register('points', { valueAsNumber: true })}
        error={errors.points?.message}
      />

      <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post challenge'}
        </button>
      </div>
    </form>
  );
}

function AptitudeForm({
  groupId,
  onPosted,
  onClose,
}: {
  groupId: string;
  onPosted: (c: Challenge) => void;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof aptitudeSchema>>({
    defaultValues: { type: 'aptitude', points: 10, correctAnswer: 'A' },
  });
  const correct = watch('correctAnswer');

  const onSubmit = async (raw: z.infer<typeof aptitudeSchema>) => {
    const parsed = aptitudeSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ challenge: Challenge }>(`/groups/${groupId}/challenges`, {
        method: 'POST',
        auth: true,
        body: {
          type: 'aptitude',
          title: parsed.data.title,
          description: parsed.data.description || undefined,
          points: parsed.data.points,
          options: {
            A: parsed.data.optionA,
            B: parsed.data.optionB,
            C: parsed.data.optionC,
            D: parsed.data.optionD,
          },
          correctAnswer: parsed.data.correctAnswer,
        },
      });
      toast.success('Challenge posted!');
      onPosted(r.challenge);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Question" {...register('title')} error={errors.title?.message} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">
          Extra context <span className="text-zinc-500">(optional)</span>
        </label>
        <textarea {...register('description')} rows={2} className="input-base resize-y" />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">
          Options — pick the correct one
        </label>
        {(['A', 'B', 'C', 'D'] as const).map((letter) => (
          <div key={letter} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setValue('correctAnswer', letter)}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition',
                correct === letter
                  ? 'border-accent-emerald/60 bg-accent-emerald/15 text-accent-emerald'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
              )}
              title={correct === letter ? 'Correct answer' : 'Mark as correct'}
            >
              {letter}
            </button>
            <input
              {...register(`option${letter}` as any)}
              placeholder={`Option ${letter}`}
              className="input-base flex-1"
            />
          </div>
        ))}
      </div>

      <Field
        label="Points"
        type="number"
        min={1}
        max={1000}
        {...register('points', { valueAsNumber: true })}
        error={errors.points?.message}
      />

      <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Post</>}
        </button>
      </div>
    </form>
  );
}
