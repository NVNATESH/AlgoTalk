'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/stores/authStore';
import { ApiError } from '@/lib/api';

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const verifyEmail = useAuth((s) => s.verifyEmail);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setState('error');
      setError('No verification token in URL.');
      return;
    }
    verifyEmail(token)
      .then(() => setState('success'))
      .catch((err) => {
        setState('error');
        setError(err instanceof ApiError ? err.message : 'Verification failed.');
      });
  }, [params, verifyEmail]);

  return (
    <AuthShell title="Email verification">
      <div className="text-center py-6">
        {state === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent-violet" />
            <p className="mt-4 text-zinc-300">Verifying your email…</p>
          </>
        )}
        {state === 'success' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <CheckCircle2 className="mx-auto h-14 w-14 text-accent-emerald" />
            <h2 className="mt-4 font-display text-xl font-semibold">You're verified!</h2>
            <p className="mt-2 text-sm text-zinc-400">Your account is now active.</p>
            <button onClick={() => router.push('/login')} className="btn-primary mt-6 w-full">
              Continue to sign in
            </button>
          </motion.div>
        )}
        {state === 'error' && (
          <>
            <AlertCircle className="mx-auto h-14 w-14 text-accent-rose" />
            <h2 className="mt-4 font-display text-xl font-semibold">Verification failed</h2>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
            <Link href="/login" className="btn-ghost mt-6 inline-flex w-full">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
