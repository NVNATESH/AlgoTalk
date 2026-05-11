'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Edit3,
  HelpCircle,
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

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Category = 'dsa' | 'system_design' | 'behavioral' | 'sql' | 'os' | 'networking' | 'hr';

interface IQSummary {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: Category;
  topic: string;
  tags: string[];
  companies: string[];
  platforms: string[];
  frequency: number;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES: { value: Category | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'dsa', label: 'DSA' },
  { value: 'system_design', label: 'System Design' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sql', label: 'SQL' },
  { value: 'os', label: 'OS' },
  { value: 'networking', label: 'Networking' },
  { value: 'hr', label: 'HR' },
];

const COMPANIES = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple',
  'Adobe', 'Flipkart', 'Atlassian', 'PayPal', 'Goldman Sachs',
  'TCS', 'Infosys', 'Zoho', 'Wipro', 'Accenture',
];

const PLATFORMS = ['LeetCode', 'GeeksForGeeks', 'HackerRank', 'Codeforces', 'InterviewBit', 'Glassdoor'];

export default function AdminQuestionBankPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [questions, setQuestions] = useState<IQSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [company, setCompany] = useState('');
  const [total, setTotal] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admin access required');
      router.replace('/dashboard');
    }
  }, [user, router]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (difficulty) params.set('difficulty', difficulty);
      if (company) params.set('company', company);
      params.set('limit', '100');
      const res = await api<{ questions: IQSummary[]; total: number }>(
        `/admin/interview-questions?${params.toString()}`,
        { auth: true }
      );
      setQuestions(res.questions);
      setTotal(res.total);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [search, category, difficulty, company]);

  useEffect(() => {
    if (user?.role === 'admin') fetchQuestions();
  }, [user?.role, fetchQuestions]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this interview question? This cannot be undone.')) return;
    try {
      await api(`/admin/interview-questions/${id}`, { method: 'DELETE', auth: true });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success('Question deleted');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Admin Hub
        </Link>
      </div>

      <header className="glass mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin Only
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold">Interview Question Bank</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Admin-curated questions from LeetCode, GFG, HackerRank, Glassdoor, etc. Served to users — no AI generation.
              <span className="ml-2 text-zinc-500">Total: {total}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setBulkOpen(true)} className="btn-ghost border border-teal-500/30 text-teal-400 hover:bg-teal-500/10">
              <Upload className="h-4 w-4" /> Bulk Import
            </button>
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Add Question
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="glass mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="input-base pl-10"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-base w-auto">
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input-base w-auto">
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <select value={company} onChange={(e) => setCompany(e.target.value)} className="input-base w-auto">
          <option value="">All Companies</option>
          {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
        </div>
      ) : questions.length === 0 ? (
        <div className="glass p-10 text-center">
          <HelpCircle className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No questions found. Click "Add Question" or "Bulk Import".</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Companies</th>
                <th className="px-4 py-3">Platforms</th>
                <th className="px-4 py-3 text-right">Freq</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium text-zinc-100 line-clamp-1">{q.title}</div>
                    <div className="text-[10px] text-zinc-500">{q.topic}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-300">
                      {q.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      q.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                      q.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                      q.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose',
                    )}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {(q.companies ?? []).slice(0, 3).map((c) => (
                        <span key={c} className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-400">{c}</span>
                      ))}
                      {(q.companies ?? []).length > 3 && (
                        <span className="text-[10px] text-zinc-500">+{q.companies.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(q.platforms ?? []).slice(0, 2).map((p) => (
                        <span key={p} className="rounded bg-accent-violet/10 px-1.5 py-0.5 text-[10px] text-accent-violet">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 text-xs">{q.frequency}%</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditId(q.id)} className="rounded p-1 text-zinc-600 hover:bg-accent-violet/10 hover:text-accent-violet">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="rounded p-1 text-zinc-600 hover:bg-accent-rose/10 hover:text-accent-rose">
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

      <QuestionFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); fetchQuestions(); }}
      />

      {editId && (
        <QuestionFormDialog
          questionId={editId}
          open
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); fetchQuestions(); }}
        />
      )}

      <BulkImportIQDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onImported={() => { setBulkOpen(false); fetchQuestions(); }}
      />
    </AppShell>
  );
}

/* ────────────────────── Question Form Dialog ────────────────────── */
function QuestionFormDialog({
  questionId,
  open,
  onClose,
  onSaved,
}: {
  questionId?: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'Medium' as Difficulty,
    category: 'dsa' as Category,
    topic: '',
    tags: '',
    companies: '',
    platforms: '',
    constraints: '',
    hints: '',
    solution: '',
    timeComplexity: '',
    spaceComplexity: '',
    frequency: 50,
    isActive: true,
  });

  useEffect(() => {
    if (!questionId) return;
    setLoading(true);
    api<{ question: any }>(`/admin/interview-questions/${questionId}`, { auth: true })
      .then((r) => {
        const q = r.question;
        setForm({
          title: q.title ?? '',
          description: q.description ?? '',
          difficulty: q.difficulty ?? 'Medium',
          category: q.category ?? 'dsa',
          topic: q.topic ?? '',
          tags: (q.tags ?? []).join(', '),
          companies: (q.companies ?? []).join(', '),
          platforms: (q.platforms ?? []).join(', '),
          constraints: q.constraints ?? '',
          hints: (q.hints ?? []).join('\n'),
          solution: q.solution ?? '',
          timeComplexity: q.expectedComplexity?.time ?? '',
          spaceComplexity: q.expectedComplexity?.space ?? '',
          frequency: q.frequency ?? 50,
          isActive: q.isActive ?? true,
        });
      })
      .catch(() => toast.error('Failed to load question'))
      .finally(() => setLoading(false));
  }, [questionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.topic) {
      toast.error('Title, description, and topic are required');
      return;
    }
    setSubmitting(true);
    const body = {
      title: form.title,
      description: form.description,
      difficulty: form.difficulty,
      category: form.category,
      topic: form.topic,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      companies: form.companies ? form.companies.split(',').map((t) => t.trim()).filter(Boolean) : [],
      platforms: form.platforms ? form.platforms.split(',').map((t) => t.trim()).filter(Boolean) : [],
      constraints: form.constraints || undefined,
      hints: form.hints ? form.hints.split('\n').map((h) => h.trim()).filter(Boolean) : [],
      solution: form.solution || undefined,
      expectedComplexity: { time: form.timeComplexity, space: form.spaceComplexity },
      frequency: form.frequency,
      isActive: form.isActive,
    };

    try {
      if (questionId) {
        await api(`/admin/interview-questions/${questionId}`, { method: 'PATCH', auth: true, body });
        toast.success('Question updated!');
      } else {
        await api('/admin/interview-questions', { method: 'POST', auth: true, body });
        toast.success('Question created!');
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={questionId ? 'Edit Interview Question' : 'Add Interview Question'}>
      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-400" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-300">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Two Sum" className="input-base" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Topic *</label>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Arrays" className="input-base" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className="input-base">
                {CATEGORIES.filter((c) => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Difficulty *</label>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })} className="input-base">
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Frequency (0–100%)</label>
              <input type="number" min={0} max={100} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: Number(e.target.value) })} className="input-base" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Description (Markdown) *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="input-base resize-y" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Companies (comma-separated)</label>
              <input value={form.companies} onChange={(e) => setForm({ ...form, companies: e.target.value })} placeholder="Google, Amazon, Meta" className="input-base" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Platforms (comma-separated)</label>
              <input value={form.platforms} onChange={(e) => setForm({ ...form, platforms: e.target.value })} placeholder="LeetCode, GFG" className="input-base" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Tags (comma-separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Arrays, Hash Table" className="input-base" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Constraints</label>
              <input value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} placeholder="1 ≤ n ≤ 10^5" className="input-base" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Time Complexity</label>
              <input value={form.timeComplexity} onChange={(e) => setForm({ ...form, timeComplexity: e.target.value })} placeholder="O(n)" className="input-base" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Space Complexity</label>
              <input value={form.spaceComplexity} onChange={(e) => setForm({ ...form, spaceComplexity: e.target.value })} placeholder="O(1)" className="input-base" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Hints (one per line)</label>
            <textarea value={form.hints} onChange={(e) => setForm({ ...form, hints: e.target.value })} rows={3} placeholder="Use a hash map..." className="input-base resize-y" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Solution Approach (Markdown)</label>
            <textarea value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} rows={4} placeholder="Use a two-pointer approach..." className="input-base resize-y" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded accent-teal-500" />
            <label htmlFor="isActive" className="text-sm text-zinc-300">Active (visible to users)</label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (questionId ? 'Save Changes' : 'Create Question')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ────────────────────── Bulk Import Dialog ────────────────────── */
function BulkImportIQDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [result, setResult] = useState<{ upserted?: number; modified?: number } | null>(null);

  const sample = `[
  {
    "title": "Two Sum",
    "description": "Given an array of integers, return indices of two numbers that add to target.",
    "difficulty": "Easy",
    "category": "dsa",
    "topic": "Arrays",
    "tags": ["Arrays", "Hash Table"],
    "companies": ["Google", "Amazon"],
    "platforms": ["LeetCode", "GeeksForGeeks"],
    "platformLinks": [{"platform": "LeetCode", "url": "https://leetcode.com/problems/two-sum/", "problemId": "1"}],
    "constraints": "2 <= nums.length <= 10^4",
    "hints": ["Use a hash map to track complements"],
    "solution": "Use a hash map to store num → index while iterating.",
    "expectedComplexity": {"time": "O(n)", "space": "O(n)"},
    "frequency": 95
  }
]`;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' && setJsonText(reader.result);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    let questions: any[];
    try {
      questions = JSON.parse(jsonText);
      if (!Array.isArray(questions) || questions.length === 0) { toast.error('JSON must be a non-empty array'); return; }
    } catch { toast.error('Invalid JSON'); return; }

    for (const q of questions) {
      if (!q.title || !q.description || !q.difficulty || !q.category || !q.topic) {
        toast.error(`Question "${q.title || '?'}" missing required fields`); return;
      }
    }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await api<{ upserted: number; modified: number }>('/admin/interview-questions/bulk-import', {
        method: 'POST', auth: true, body: { questions },
      });
      setResult(res);
      toast.success(`Imported! ${res.upserted} new, ${res.modified} updated`);
      onImported();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Bulk Import Interview Questions">
      <div className="space-y-4">
        <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 text-xs text-teal-400">
          Import questions from any platform. Each must have: title, description, difficulty, category, topic.
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Upload JSON file</label>
          <input type="file" accept=".json" onChange={handleFile} className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-accent-violet/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-violet" />
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium text-zinc-300">
            <span>Or paste JSON</span>
            <button type="button" onClick={() => setJsonText(sample)} className="text-xs text-accent-violet hover:underline">Load sample</button>
          </label>
          <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={12} placeholder="Paste JSON array..." className="input-base resize-y font-mono text-xs" />
        </div>
        {result && (
          <div className="rounded-lg border border-accent-emerald/30 bg-accent-emerald/5 p-3 text-sm text-accent-emerald">
            ✓ {result.upserted} new, {result.modified} updated
          </div>
        )}
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <p className="text-xs text-zinc-500">Supports: LeetCode, GFG, HackerRank, Glassdoor format</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={handleImport} disabled={submitting || !jsonText.trim()} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Import</>}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
