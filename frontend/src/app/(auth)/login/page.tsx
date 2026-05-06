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
import { Loader2, ShieldCheck } from 'lucide-react';

const schema = z.object({
  emailOrUsername: z.string().min(3, 'Required'),
  password: z.string().min(1, 'Required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<FormValues | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
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
      await login(parsed.data.emailOrUsername, parsed.data.password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 401 &&
        (err.details as { code?: string } | undefined)?.code === 'TWO_FACTOR_REQUIRED'
      ) {
        setPending(parsed.data);
        return;
      }
      const msg = err instanceof ApiError ? err.message : 'Login failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submit2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return;
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error(useRecovery ? 'Enter a recovery code' : 'Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      await login(pending.emailOrUsername, pending.password, {
        ...(useRecovery ? { recoveryCode: trimmed } : { totpCode: trimmed }),
      });
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Verification failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (pending) {
    return (
      <AuthShell
        title="Two-factor verification"
        subtitle={`Enter the ${useRecovery ? 'recovery code' : '6-digit code'} from your authenticator app.`}
        footer={
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setCode('');
              setUseRecovery(false);
            }}
            className="link-accent"
          >
            ← Sign in as a different user
          </button>
        }
      >
        <form onSubmit={submit2fa} className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-3 text-xs text-accent-violet">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>
              Signed in as <span className="font-mono">{pending.emailOrUsername}</span>
            </span>
          </div>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {useRecovery ? 'Recovery code' : '6-digit code'}
            </span>
            <input
              autoFocus
              inputMode={useRecovery ? 'text' : 'numeric'}
              value={code}
              onChange={(e) =>
                setCode(useRecovery ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder={useRecovery ? 'XXXX-XXXX-XX' : '123456'}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-zinc-100 outline-none transition focus:border-accent-violet/40 focus:ring-2 focus:ring-accent-violet/20"
            />
          </label>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & sign in'}
          </button>
          <button
            type="button"
            onClick={() => {
              setUseRecovery((v) => !v);
              setCode('');
            }}
            className="block w-full text-center text-xs text-zinc-400 hover:text-accent-violet"
          >
            {useRecovery ? 'Use authenticator code instead' : 'Use a recovery code instead'}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your learning journey."
      footer={
        <>
          New here?{' '}
          <Link href="/register" className="link-accent">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          label="Email or username"
          autoComplete="username"
          {...register('emailOrUsername')}
          error={errors.emailOrUsername?.message}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
        />
        <div className="flex justify-end -mt-2">
          <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-accent-violet">
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
