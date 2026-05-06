'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field } from '@/components/auth/Field';
import { useAuth } from '@/stores/authStore';
import { ApiError } from '@/lib/api';
import { AlertCircle, Loader2 } from 'lucide-react';

const schema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { message: 'Passwords must match', path: ['confirm'] });
type FormValues = z.infer<typeof schema>;

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const resetPassword = useAuth((s) => s.resetPassword);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  if (!token) {
    return (
      <AuthShell title="Reset password">
        <div className="text-center py-6">
          <AlertCircle className="mx-auto h-12 w-12 text-accent-rose" />
          <p className="mt-3 text-sm text-zinc-400">No reset token in URL.</p>
          <Link href="/forgot-password" className="btn-ghost mt-6 inline-flex w-full">
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  const onSubmit = async (raw: FormValues) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, parsed.data.newPassword);
      toast.success('Password reset — please sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Choose something secure you'll remember.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          error={errors.newPassword?.message}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          {...register('confirm')}
          error={errors.confirm?.message}
        />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
