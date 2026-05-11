'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Edit3,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/Modal';

interface AdminProblem {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  companyTags: string[];
  testCaseCount: number;
  createdAt: string;
}

const COMPANIES = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple',
  'Adobe', 'Flipkart', 'Atlassian', 'PayPal', 'Goldman Sachs',
  'TCS', 'Infosys', 'Zoho', 'Wipro', 'Accenture',
];

export default function AdminCompanyQuestionsPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [company, setCompany] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admin access required');
      router.replace('/dashboard');
    }
  }, [user, router]);

  const fetchProblems = useCallback(async () => {
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
      // Filter for problems with company tags
      let filtered = res.problems.filter((p) => (p.companyTags ?? []).length > 0);
      if (company) {
        filtered = filtered.filter((p) =>
          (p.companyTags ?? []).some((c) => c.toLowerCase() === company.toLowerCase())
        );
      }
      setProblems(filtered);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search, difficulty, company]);

  useEffect(() => {
    if (user?.role === 'admin') fetchProblems();
  }, [user?.role, fetchProblems]);

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete company question "${slug}"? This cannot be undone.`)) return;
    try {
      await api(`/admin/problems/${slug}`, { method: 'DELETE', auth: true });
      setProblems((prev) => prev.filter((p) => p.slug !== slug));
      toast.success('Question deleted');
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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-cyan">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin Only
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold">Company Questions</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage company-tagged interview problems. AI generation is disabled — all questions are manually curated.
            </p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Company Question
          </button>
          <button onClick={() => setBulkOpen(true)} className="btn-ghost border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10">
            <Upload className="h-4 w-4" /> Bulk Import
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="glass mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company questions..."
            className="input-base pl-10"
          />
        </div>
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="input-base w-auto"
        >
          <option value="">All Companies</option>
          {COMPANIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="input-base w-auto"
        >
          <option value="">All Difficulties</option>
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
          <Building2 className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">
            No company questions found. Click &ldquo;Add Company Question&rdquo; to create one.
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Companies</th>
                <th className="px-4 py-3">Tags</th>
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
                      {(p.companyTags ?? []).map((c) => (
                        <span key={c} className="rounded bg-accent-cyan/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-cyan">
                          {c}
                        </span>
                      ))}
                    </div>
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
                  <td className="px-4 py-3 text-right text-zinc-400">{p.testCaseCount ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditSlug(p.slug)}
                        className="rounded p-1 text-zinc-600 transition hover:bg-accent-violet/10 hover:text-accent-violet"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.slug)}
                        className="rounded p-1 text-zinc-600 transition hover:bg-accent-rose/10 hover:text-accent-rose"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCompanyQuestionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); fetchProblems(); }}
      />

      {editSlug && (
        <EditCompanyQuestionDialog
          slug={editSlug}
          onClose={() => setEditSlug(null)}
          onUpdated={() => { setEditSlug(null); fetchProblems(); }}
        />
      )}

      <BulkImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onImported={() => { setBulkOpen(false); fetchProblems(); }}
      />
    </AppShell>
  );
}

/* ────────────────────── Create Dialog ────────────────────── */
function CreateCompanyQuestionDialog({
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
    const companyTags = form.companyTags.split(',').map((t) => t.trim()).filter(Boolean);
    if (companyTags.length === 0) {
      toast.error('At least one company tag is required for company questions');
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
          companyTags,
          inputFormat: form.inputFormat || undefined,
          outputFormat: form.outputFormat || undefined,
          constraints: form.constraints || undefined,
        },
      });
      toast.success('Company question created!');
      onCreated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Add Company Question (Admin)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
          <strong>Admin Only:</strong> AI generation is disabled. All company questions must be manually authored.
        </div>
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
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as 'Easy' | 'Medium' | 'Hard' })}
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
            <label className="mb-1 block text-sm font-medium text-zinc-300">Companies (comma-separated) *</label>
            <input
              value={form.companyTags}
              onChange={(e) => setForm({ ...form, companyTags: e.target.value })}
              placeholder="Google, Amazon"
              className="input-base"
              required
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
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Question'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ────────────────────── Edit Dialog ────────────────────── */
function EditCompanyQuestionDialog({
  slug,
  onClose,
  onUpdated,
}: {
  slug: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    tags: '',
    companyTags: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ problem: any }>(`/admin/problems/${slug}`, { auth: true });
        const p = res.problem;
        setForm({
          title: p.title ?? '',
          description: p.description ?? '',
          difficulty: p.difficulty ?? 'Medium',
          tags: (p.tags ?? []).join(', '),
          companyTags: (p.companyTags ?? []).join(', '),
          inputFormat: p.inputFormat ?? '',
          outputFormat: p.outputFormat ?? '',
          constraints: p.constraints ?? '',
        });
      } catch (e) {
        toast.error('Failed to load problem');
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api(`/admin/problems/${slug}`, {
        method: 'PATCH',
        auth: true,
        body: {
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
      toast.success('Question updated!');
      onUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`Edit: ${slug}`}>
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-base"
            />
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
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as 'Easy' | 'Medium' | 'Hard' })}
                className="input-base"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Tags</label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Companies *</label>
              <input
                value={form.companyTags}
                onChange={(e) => setForm({ ...form, companyTags: e.target.value })}
                className="input-base"
                required
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
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ────────────────────── Bulk Import Dialog ────────────────────── */
function BulkImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [result, setResult] = useState<{ upserted?: number; modified?: number } | null>(null);

  const sampleJson = `[
  {
    "slug": "example-problem",
    "title": "Example Problem",
    "description": "Problem description in **markdown**.",
    "difficulty": "Medium",
    "tags": ["Arrays", "Hash Table"],
    "companyTags": ["Google", "Amazon"],
    "inputFormat": "First line: n. Second line: n integers.",
    "outputFormat": "An integer.",
    "constraints": "1 <= n <= 10^5",
    "examples": [{"input": "3\\n1 2 3", "output": "6", "explanation": "Sum of all."}],
    "testCases": [{"stdin": "3\\n1 2 3", "expectedStdout": "6"}]
  }
]`;

  const handleImport = async () => {
    let problems: any[];
    try {
      problems = JSON.parse(jsonText);
      if (!Array.isArray(problems) || problems.length === 0) {
        toast.error('JSON must be a non-empty array of problems');
        return;
      }
    } catch {
      toast.error('Invalid JSON format');
      return;
    }

    for (const p of problems) {
      if (!p.slug || !p.title || !p.description || !p.difficulty) {
        toast.error(`Problem "${p.slug || p.title || '?'}" missing required fields (slug, title, description, difficulty)`);
        return;
      }
      if (!p.companyTags || p.companyTags.length === 0) {
        toast.error(`Problem "${p.slug}" must have at least one companyTag`);
        return;
      }
    }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await api<{ upserted: number; modified: number }>('/admin/problems/bulk-import', {
        method: 'POST',
        auth: true,
        body: { problems },
      });
      setResult(res);
      toast.success(`Imported! ${res.upserted} new, ${res.modified} updated`);
      onImported();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Bulk import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setJsonText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Bulk Import Interview Questions">
      <div className="space-y-4">
        <div className="rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 p-3 text-xs text-accent-cyan">
          <strong>Bulk Import:</strong> Paste or upload a JSON array of problems. Each problem must include
          slug, title, description, difficulty, and companyTags. Existing slugs will be updated.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Upload JSON file
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFile}
            className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-accent-violet/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-violet hover:file:bg-accent-violet/30"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium text-zinc-300">
            <span>Or paste JSON directly</span>
            <button
              type="button"
              onClick={() => setJsonText(sampleJson)}
              className="text-xs text-accent-violet hover:underline"
            >
              Load sample
            </button>
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={12}
            placeholder="Paste JSON array of problems here..."
            className="input-base resize-y font-mono text-xs"
          />
        </div>

        {result && (
          <div className="rounded-lg border border-accent-emerald/30 bg-accent-emerald/5 p-3 text-sm text-accent-emerald">
            Import successful: <strong>{result.upserted}</strong> new questions,{' '}
            <strong>{result.modified}</strong> updated.
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <p className="text-xs text-zinc-500">
            Supports: LeetCode, GFG, HackerRank, Codeforces format
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={handleImport}
              disabled={submitting || !jsonText.trim()}
              className="btn-primary"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Import</>}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
