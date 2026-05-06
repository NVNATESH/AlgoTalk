'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Mic, Sparkles } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/auth/Field';
import { api, ApiError } from '@/lib/api';
import type {
  InterviewDifficulty,
  InterviewRole,
  InterviewSession,
} from '@/types/interview';
import { cn } from '@/lib/utils';

const DIFFICULTIES: InterviewDifficulty[] = ['Easy', 'Medium', 'Hard'];
const ROLES: InterviewRole[] = [
  'SDE-1 (entry)',
  'SDE-2 (mid)',
  'SDE-3 (senior)',
  'Backend',
  'Frontend',
  'ML',
  'Generic',
];

const TOPIC_EXAMPLES = [
  'Sliding window',
  'Dynamic programming',
  'Graph traversal',
  'Trees / BST',
  'Two pointers',
  'Hashing',
  'Stack / Queue',
  'Binary search',
];

const schema = z.object({
  topic: z.string().min(2).max(120),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  role: z.enum([
    'SDE-1 (entry)',
    'SDE-2 (mid)',
    'SDE-3 (senior)',
    'Backend',
    'Frontend',
    'ML',
    'Generic',
  ]),
  notes: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

export function StartInterviewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { difficulty: 'Medium', role: 'SDE-2 (mid)' },
  });

  const difficulty = watch('difficulty');
  const role = watch('role');

  const onSubmit = async (raw: FormValues) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ session: InterviewSession }>('/interview', {
        method: 'POST',
        auth: true,
        body: parsed.data,
      });
      toast.success(`Problem ready: ${r.session.problem.title}`);
      router.push(`/interview/${r.session.id}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start interview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Start a mock interview">
      <p className="-mt-2 mb-5 text-sm text-zinc-400">
        Gemini generates an original problem matched to your topic, level, and role. Then you'll
        speak your approach, write code in a plain whiteboard, and submit for a verdict.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Topic</label>
          <textarea
            {...register('topic')}
            rows={2}
            placeholder="e.g. Sliding window, Dynamic programming, Graph traversal..."
            className="input-base resize-none"
          />
          {errors.topic && <span className="mt-1 block text-xs text-accent-rose">{errors.topic.message}</span>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TOPIC_EXAMPLES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setValue('topic', t)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400 hover:border-accent-violet/40 hover:text-zinc-200"
              >
                <Sparkles className="mr-1 inline h-3 w-3 text-accent-violet" />
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setValue('difficulty', d)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                  difficulty === d
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
          <label className="mb-2 block text-sm font-medium text-zinc-300">Role</label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setValue('role', r)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-medium transition',
                  role === r
                    ? 'border-accent-violet/60 bg-accent-violet/10 text-white'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                )}
              >
                {r}
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
            placeholder="Specific subtopic, type of problem, constraints to avoid..."
            className="input-base resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating problem…
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" /> Start interview
              </>
            )}
          </button>
        </div>
        {submitting && (
          <p className="text-center text-xs text-zinc-500">
            Building an original problem just for you — usually takes 5–15 seconds.
          </p>
        )}
      </form>
    </Modal>
  );
}
