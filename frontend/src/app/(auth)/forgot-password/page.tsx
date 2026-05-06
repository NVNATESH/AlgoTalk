'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field } from '@/components/auth/Field';
import { useAuth } from '@/stores/authStore';
import { ApiError } from '@/lib/api';
import { Loader2, MailCheck } from 'lucide-react';

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgotPassword = useAuth((s) => s.forgotPassword);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = async (raw: FormValues) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return;
    setSubmitting(true);
    try {
      await forgotPassword(parsed.data.email);
      setSentTo(parsed.data.email);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If an account exists for ${sentTo}, a reset link has been sent.`}
        footer={
          <Link href="/login" className="link-accent">
            Back to sign in
          </Link>
        }
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-accent-emerald" />
          <p className="mt-3 text-sm text-zinc-300">The link expires in 1 hour.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="link-accent">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
