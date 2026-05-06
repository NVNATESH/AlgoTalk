'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, AlertCircle } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';

interface CompanyEntry {
  name: string;
  count: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ companies: CompanyEntry[] }>('/problems/companies', { auth: true })
      .then((r) => {
        if (!cancelled) setCompanies(r.companies);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <header className="mb-6">
        <Link
          href="/problems"
          className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-3 w-3" /> Back to all problems
        </Link>
        <h1 className="font-display text-3xl font-bold md:text-4xl">🏢 Browse by company</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Practice problems known to be asked at specific companies.
        </p>
      </header>

      {error ? (
        <div className="glass flex items-center gap-2 p-6 text-accent-rose">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      ) : loading ? (
        <SkeletonGrid />
      ) : companies.length === 0 ? (
        <div className="glass p-10 text-center">
          <div className="text-5xl">🏢</div>
          <h3 className="mt-3 font-display text-lg font-semibold">No company tags yet</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Problems get company tags after admins assign them or AI infers them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {companies.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Link
                href={`/problems/company/${encodeURIComponent(c.name)}`}
                className="glass group flex flex-col items-start gap-2 p-4 transition hover:border-accent-violet/50 hover:bg-white/[0.07]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/30 to-accent-violet/5 text-accent-violet">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="font-display text-base font-semibold text-zinc-100 transition group-hover:text-accent-violet">
                  {c.name}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                  {c.count} problem{c.count === 1 ? '' : 's'}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="glass h-28 animate-pulse" />
      ))}
    </div>
  );
}
