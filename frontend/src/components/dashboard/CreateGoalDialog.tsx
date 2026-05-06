'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Sparkles, Target, Wand2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/auth/Field';
import { useGoals } from '@/stores/goalStore';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const schema = z.object({
  topic: z.string().min(2, 'Tell us what you want to learn').max(120),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Master']),
  weeklyHours: z.coerce.number().int().min(1).max(80),
  deadlineDays: z.coerce.number().int().min(3).max(365),
  priority: z.enum(['P0', 'P1', 'P2']),
  notes: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

const examples = [
  'Master dynamic programming for SDE interviews',
  'Build full-stack apps with Next.js and Postgres',
  'Get comfortable with system design fundamentals',
  'Learn graph algorithms for competitive programming',
];

export function CreateGoalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useGoals((s) => s.create);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      difficulty: 'Intermediate',
      weeklyHours: 8,
      deadlineDays: 30,
      priority: 'P1',
    },
  });

  const difficulty = watch('difficulty');
  const priority = watch('priority');

  const onSubmit = async (raw: FormValues) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }
    setSubmitting(true);
    try {
      const goal = await create(parsed.data);
      toast.success(`Created "${goal.name}" with ${goal.modules.length} modules.`);
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not generate roadmap');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Create a new goal">
      <p className="-mt-2 mb-6 text-sm text-zinc-400">
        Describe what you want to learn — Gemini will generate a personalized roadmap of modules.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            What do you want to learn?
          </label>
          <textarea
            {...register('topic')}
            rows={2}
            placeholder="e.g. Master dynamic programming for SDE interviews"
            className="input-base resize-none"
          />
          {errors.topic && <span className="mt-1 block text-xs text-accent-rose">{errors.topic.message}</span>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {examples.map((ex) => (
              <button
                type="button"
                key={ex}
                onClick={() => setValue('topic', ex)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 hover:border-accent-violet/40 hover:text-zinc-200"
              >
                <Sparkles className="mr-1 inline h-3 w-3 text-accent-violet" />
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Target level</label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {(['Beginner', 'Intermediate', 'Advanced', 'Master'] as const).map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setValue('difficulty', d)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                  difficulty === d
                    ? 'border-accent-violet/60 bg-accent-violet/15 text-white'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Weekly hours"
            type="number"
            min={1}
            max={80}
            {...register('weeklyHours', { valueAsNumber: true })}
            error={errors.weeklyHours?.message}
          />
          <Field
            label="Deadline (days)"
            type="number"
            min={3}
            max={365}
            {...register('deadlineDays', { valueAsNumber: true })}
            error={errors.deadlineDays?.message}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Priority</label>
          <div className="grid grid-cols-3 gap-2">
            {(['P0', 'P1', 'P2'] as const).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setValue('priority', p)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-medium transition',
                  priority === p
                    ? 'border-accent-fuchsia/60 bg-accent-fuchsia/10 text-white'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                )}
              >
                {p}{' '}
                <span className="ml-1 text-[10px] text-zinc-500">
                  {p === 'P0' ? 'urgent' : p === 'P1' ? 'normal' : 'someday'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Anything else? <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Constraints, prior knowledge, focus areas..."
            className="input-base resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating roadmap…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" /> Generate with Gemini
              </>
            )}
          </button>
        </div>
        {submitting && (
          <p className="text-center text-xs text-zinc-500">
            <Target className="mr-1 inline h-3 w-3" />
            Designing modules just for you — usually takes 5–10 seconds.
          </p>
        )}
      </form>
    </Modal>
  );
}
