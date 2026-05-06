'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { Field } from '@/components/auth/Field';
import { useAuth } from '@/stores/authStore';
import { ApiError } from '@/lib/api';
import { Loader2, MailCheck } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Required').max(80),
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscore only'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(128),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuth((s) => s.register);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = async (raw: FormValues) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? 'Invalid form');
      return;
    }
    setSubmitting(true);
    try {
      await registerUser(parsed.data);
      setDone(parsed.data.email);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a verification link to ${done}.`}
        footer={
          <>
            Didn't get it?{' '}
            <Link href={`/login`} className="link-accent">
              Go to login
            </Link>
          </>
        }
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-accent-emerald" />
          <p className="mt-3 text-sm text-zinc-300">
            Click the link in the email to activate your account. (In dev, the link is logged to the
            backend console.)
          </p>
          <button onClick={() => router.push('/login')} className="btn-primary mt-5 w-full">
            Continue to sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start learning, collaborating, and competing."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="link-accent">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Full name" {...register('name')} error={errors.name?.message} />
        <Field
          label="Username"
          autoComplete="username"
          {...register('username')}
          error={errors.username?.message}
          hint="Letters, numbers, underscore. 3–30 chars."
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
          hint="At least 8 characters."
        />
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
