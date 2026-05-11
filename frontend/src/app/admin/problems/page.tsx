'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/auth/Field';

interface AdminProblem {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  companyTags: string[];
  testCaseCount: number;
  createdAt: string;
}

export default function AdminProblemsPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admin access required');
      router.replace('/dashboard');
    }
  }, [user, router]);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (difficulty) params.set('difficulty', difficulty);
      params.set('limit', '200');
      const res = await api<{ problems: AdminProblem[]; total: number }>(
        `/admin/problems?${params.toString()}`,
        { auth: true }
      );
      setProblems(res.problems);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') fetchProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, search, difficulty]);

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete problem "${slug}"? This cannot be undone.`)) return;
    try {
      await api(`/admin/problems/${slug}`, { method: 'DELETE', auth: true });
      setProblems((prev) => prev.filter((p) => p.slug !== slug));
      toast.success('Problem deleted');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <AppShell>
      <div className="mb-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" /> Admin Hub
        </Link>
      </div>

      <header className="glass mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Problem Management</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Admin-only: Upload, manage, and categorize problems. Users can only view and solve.
            </p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Problem
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="glass mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="input-base pl-10"
          />
        </div>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="input-base w-auto"
        >
          <option value="">All difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      {/* Problem list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
        </div>
      ) : problems.length === 0 ? (
        <div className="glass p-10 text-center">
          <p className="text-sm text-zinc-400">No problems found.</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Companies</th>
                <th className="px-4 py-3 text-right">Tests</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((p) => (
                <tr key={p.slug} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/solve/${p.slug}`}
                      className="font-medium text-accent-violet hover:text-accent-fuchsia"
                    >
                      {p.title}
                    </Link>
                    <div className="text-[10px] text-zinc-500">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        p.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                        p.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                        p.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                      )}
                    >
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.tags ?? []).slice(0, 3).map((t) => (
                        <span key={t} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.companyTags ?? []).slice(0, 3).map((c) => (
                        <span key={c} className="rounded bg-accent-violet/10 px-1.5 py-0.5 text-[10px] text-accent-violet">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">{p.testCaseCount ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(p.slug)}
                      className="rounded p-1 text-zinc-600 transition hover:bg-accent-rose/10 hover:text-accent-rose"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateProblemDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); fetchProblems(); }}
      />
    </AppShell>
  );
}

function CreateProblemDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    title: '',
    description: '',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    tags: '',
    companyTags: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug || !form.title || !form.description) {
      toast.error('Fill in slug, title, and description');
      return;
    }
    setSubmitting(true);
    try {
      await api('/admin/problems', {
        method: 'POST',
        auth: true,
        body: {
          slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
          title: form.title,
          description: form.description,
          difficulty: form.difficulty,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          companyTags: form.companyTags ? form.companyTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          inputFormat: form.inputFormat || undefined,
          outputFormat: form.outputFormat || undefined,
          constraints: form.constraints || undefined,
        },
      });
      toast.success('Problem created!');
      onCreated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Create Problem (Admin)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="two-sum"
              className="input-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Two Sum"
              className="input-base"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Description (Markdown)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            className="input-base resize-y"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })}
              className="input-base"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="array, hash-table"
              className="input-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Companies (comma-separated)</label>
            <input
              value={form.companyTags}
              onChange={(e) => setForm({ ...form, companyTags: e.target.value })}
              placeholder="Google, Amazon"
              className="input-base"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Input Format</label>
            <textarea
              value={form.inputFormat}
              onChange={(e) => setForm({ ...form, inputFormat: e.target.value })}
              rows={2}
              className="input-base resize-y"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Output Format</label>
            <textarea
              value={form.outputFormat}
              onChange={(e) => setForm({ ...form, outputFormat: e.target.value })}
              rows={2}
              className="input-base resize-y"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Constraints</label>
          <textarea
            value={form.constraints}
            onChange={(e) => setForm({ ...form, constraints: e.target.value })}
            rows={2}
            className="input-base resize-y"
          />
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Problem'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
