'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Code2,
  FileQuestion,
  HelpCircle,
  Layers,
  Mic,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/stores/authStore';

const SECTIONS = [
  {
    title: 'Problem Management',
    description: 'Create, edit, delete, and categorize coding problems. Upload test cases and starter code.',
    href: '/admin/problems',
    icon: Code2,
    color: 'from-accent-violet to-accent-fuchsia',
    badge: 'CRUD',
  },
  {
    title: 'Company Questions',
    description: 'Manage company-tagged interview problems. Tag questions by company (Google, Amazon, etc.).',
    href: '/admin/company-questions',
    icon: FileQuestion,
    color: 'from-accent-cyan to-blue-500',
    badge: 'Admin Only',
  },
  {
    title: 'Quest Management',
    description: 'Create and manage quest templates — learning paths, DSA sheets, and skill progression tracks.',
    href: '/admin/recommended-goals',
    icon: Target,
    color: 'from-accent-emerald to-green-500',
    badge: 'Templates',
  },
  {
    title: 'Interview Question Bank',
    description: 'Manage curated interview questions from LeetCode, GFG, HackerRank, etc. for every company. No AI — all admin-curated.',
    href: '/admin/question-bank',
    icon: HelpCircle,
    color: 'from-teal-500 to-cyan-600',
    badge: 'Question Bank',
  },
  {
    title: 'Interview Questions',
    description: 'Manage curated interview questions by topic, difficulty, and company. No AI generation allowed.',
    href: '/admin/interview-questions',
    icon: Mic,
    color: 'from-amber-500 to-orange-500',
    badge: 'Manual Only',
  },
  {
    title: 'Manage Quest & Interview Questions',
    description: 'Assign, remove, and organize questions within quest modules and interview paths. Full CRUD.',
    href: '/admin/manage-questions',
    icon: Layers,
    color: 'from-rose-500 to-pink-600',
    badge: 'Questions',
  },
] as const;

export default function AdminHubPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admin access required');
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') return null;

  return (
    <AppShell>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
          <ShieldCheck className="h-3.5 w-3.5" /> Admin Panel
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">
          Content Management
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Full administrative control over problems, quests, and interview questions.
          AI generation is disabled — all content is manually curated by authorized admins.
        </p>
      </header>

      {/* RBAC Notice */}
      <div className="glass mb-6 border-accent-violet/20 bg-accent-violet/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-violet" />
          <div>
            <p className="text-sm font-medium text-zinc-200">Role-Based Access Control Active</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Only admin users can create, modify, or delete content.
              Regular users have read-only access. AI generation is completely restricted in these sections.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section, i) => (
          <motion.div
            key={section.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={section.href}
              className="glass group flex h-full flex-col p-6 transition hover:border-white/10 hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${section.color} text-white`}
                >
                  <section.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  {section.badge}
                </span>
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold group-hover:text-accent-violet transition">
                {section.title}
              </h2>
              <p className="mt-1 flex-1 text-sm text-zinc-400">{section.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="mt-8 glass p-5">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-zinc-300">
          <Users className="h-4 w-4 text-accent-cyan" /> Access Policy Summary
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs text-zinc-400">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="font-medium text-zinc-200">Admin Users</div>
            <p className="mt-0.5">Full CRUD on problems, quests, and interview questions</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="font-medium text-zinc-200">Regular Users</div>
            <p className="mt-0.5">View and solve questions only — no modifications allowed</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="font-medium text-zinc-200">AI Restrictions</div>
            <p className="mt-0.5">AI generation completely disabled for company &amp; quest questions</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
