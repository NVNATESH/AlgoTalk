'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  Search,
  ArrowRight,
  TrendingUp,
  Users,
  BookOpen,
  Filter,
  Star,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CompanyInfo {
  name: string;
  icon: string;
  tier: 'faang' | 'product' | 'service';
  questionCount: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

const COMPANIES: CompanyInfo[] = [
  { name: 'Google', icon: '🔍', tier: 'faang', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Amazon', icon: '📦', tier: 'faang', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Microsoft', icon: '🪟', tier: 'faang', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Adobe', icon: '🎨', tier: 'product', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Flipkart', icon: '🛒', tier: 'product', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Atlassian', icon: '🔷', tier: 'product', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'PayPal', icon: '💳', tier: 'product', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'TCS', icon: '🏢', tier: 'service', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Infosys', icon: '🏛️', tier: 'service', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Zoho', icon: '📧', tier: 'product', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Wipro', icon: '🌿', tier: 'service', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
  { name: 'Accenture', icon: '⚡', tier: 'service', questionCount: 0, easyCount: 0, mediumCount: 0, hardCount: 0 },
];

type TierFilter = 'all' | 'faang' | 'product' | 'service';

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<TierFilter>('all');
  const [companies, setCompanies] = useState<CompanyInfo[]>(COMPANIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch actual problem counts per company
    api<{ problems: Array<{ companyTags: string[]; difficulty: string }> }>('/problems?limit=5000', { auth: true })
      .then((r) => {
        const counts = new Map<string, { total: number; easy: number; medium: number; hard: number }>();
        for (const p of r.problems ?? []) {
          for (const tag of p.companyTags ?? []) {
            const key = tag.toLowerCase();
            if (!counts.has(key)) counts.set(key, { total: 0, easy: 0, medium: 0, hard: 0 });
            const c = counts.get(key)!;
            c.total++;
            if (p.difficulty === 'Easy') c.easy++;
            else if (p.difficulty === 'Medium') c.medium++;
            else c.hard++;
          }
        }
        setCompanies(prev =>
          prev.map(co => {
            const c = counts.get(co.name.toLowerCase());
            return c
              ? { ...co, questionCount: c.total, easyCount: c.easy, mediumCount: c.medium, hardCount: c.hard }
              : co;
          })
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter(c => {
    if (tier !== 'all' && c.tier !== tier) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <header className="mb-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
            <Building2 className="h-3 w-3" /> Company-wise Preparation
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">🏢 Browse Companies</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Practice company-specific interview questions and prepare with curated roadmaps.
          </p>
        </motion.div>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="input-base pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-4 w-4 text-zinc-500" />
          {([
            { key: 'all', label: 'All', icon: '🌐' },
            { key: 'faang', label: 'FAANG+', icon: '⭐' },
            { key: 'product', label: 'Product', icon: '🚀' },
            { key: 'service', label: 'Service', icon: '🏢' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTier(t.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                tier === t.key
                  ? 'border-accent-violet/60 bg-accent-violet/15 text-accent-violet'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((co, i) => (
          <motion.div
            key={co.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.2) }}
          >
            <Link
              href={`/problems/company/${encodeURIComponent(co.name.toLowerCase())}`}
              className="glass group block p-5 transition hover:border-accent-violet/30 hover:shadow-lg hover:shadow-accent-violet/5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/20 to-purple-600/10 text-2xl">
                  {co.icon}
                </div>
                <span className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
                  co.tier === 'faang' && 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber',
                  co.tier === 'product' && 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet',
                  co.tier === 'service' && 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan',
                )}>
                  {co.tier === 'faang' ? 'FAANG+' : co.tier}
                </span>
              </div>

              <h3 className="font-display text-lg font-bold text-zinc-100 group-hover:text-accent-violet transition">
                {co.name}
              </h3>

              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {co.questionCount} questions
                </span>
              </div>

              {co.questionCount > 0 && (
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-2 py-0.5 text-[10px] text-accent-emerald">
                    Easy {co.easyCount}
                  </span>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                    Medium {co.mediumCount}
                  </span>
                  <span className="rounded-full border border-accent-rose/30 bg-accent-rose/10 px-2 py-0.5 text-[10px] text-accent-rose">
                    Hard {co.hardCount}
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-accent-violet opacity-0 group-hover:opacity-100 transition">
                  Start Practice
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-violet/10 text-accent-violet transition group-hover:bg-accent-violet/20">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
