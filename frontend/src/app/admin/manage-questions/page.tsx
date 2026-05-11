'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Edit3,
  Link2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlink,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import type { Goal, GoalType, GoalCategory, Difficulty } from '@/types/goal';

interface GoalListResponse {
  goals: Goal[];
  total: number;
}

interface ProblemSummary {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  companyTags: string[];
}

const GOAL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'quest', label: 'Quest' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'company_prep', label: 'Company Prep' },
];

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'dsa', label: 'DSA' },
  { value: 'system_design', label: 'System Design' },
  { value: 'sql', label: 'SQL' },
  { value: 'dbms', label: 'DBMS' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'ai_ml', label: 'AI/ML' },
  { value: 'aptitude', label: 'Aptitude' },
  { value: 'company', label: 'Company' },
  { value: 'other', label: 'Other' },
];

export default function AdminManageQuestionsPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [goalType, setGoalType] = useState('');
  const [category, setCategory] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Assign problem modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');
  const [problemResults, setProblemResults] = useState<ProblemSummary[]>([]);
  const [searchingProblems, setSearchingProblems] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Create problem modal
  const [createOpen, setCreateOpen] = useState(false);

  // Edit template modal
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admin access required');
      router.replace('/dashboard');
    }
  }, [user, router]);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (goalType) params.set('goalType', goalType);
      if (category) params.set('category', category);
      params.set('limit', '100');
      const res = await api<GoalListResponse>(`/admin/recommended-goals?${params}`, { auth: true });
      setGoals(res.goals);
      if (!selectedGoal && res.goals.length > 0) setSelectedGoal(res.goals[0]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search, goalType, category]);

  useEffect(() => {
    if (user?.role === 'admin') fetchGoals();
  }, [user?.role, fetchGoals]);

  const refreshGoal = async (goalId: string) => {
    try {
      const res = await api<{ goal: Goal }>(`/admin/recommended-goals/${goalId}`, { auth: true });
      const updated = res.goal;
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setSelectedGoal(updated);
    } catch {}
  };

  // Delete template
  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      await api(`/admin/recommended-goals/${goalId}`, { method: 'DELETE', auth: true });
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      if (selectedGoal?.id === goalId) setSelectedGoal(null);
      toast.success('Template deleted');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  // Delete module
  const handleDeleteModule = async (moduleId: string) => {
    if (!selectedGoal || !confirm('Delete this module?')) return;
    try {
      await api(`/admin/recommended-goals/${selectedGoal.id}/modules/${moduleId}`, {
        method: 'DELETE',
        auth: true,
      });
      await refreshGoal(selectedGoal.id);
      toast.success('Module deleted');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  // Search problems for assignment
  const searchProblems = async () => {
    if (!problemSearch.trim()) return;
    setSearchingProblems(true);
    try {
      const params = new URLSearchParams({ search: problemSearch, limit: '20' });
      const res = await api<{ problems: ProblemSummary[] }>(`/admin/problems?${params}`, { auth: true });
      setProblemResults(res.problems);
    } catch (e) {
      toast.error('Problem search failed');
    } finally {
      setSearchingProblems(false);
    }
  };

  // Assign problem to module
  const assignProblem = async (slug: string) => {
    if (!selectedGoal || !selectedModuleId) return;
    setAssigning(true);
    try {
      await api(`/admin/recommended-goals/${selectedGoal.id}/modules/${selectedModuleId}/problems`, {
        method: 'POST',
        auth: true,
        body: { slug },
      });
      await refreshGoal(selectedGoal.id);
      toast.success(`Problem "${slug}" assigned`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Assign failed');
    } finally {
      setAssigning(false);
    }
  };

  // Remove problem from module
  const removeProblem = async (moduleId: string, slug: string) => {
    if (!selectedGoal) return;
    try {
      await api(`/admin/recommended-goals/${selectedGoal.id}/modules/${moduleId}/problems/${slug}`, {
        method: 'DELETE',
        auth: true,
      });
      await refreshGoal(selectedGoal.id);
      toast.success(`Problem "${slug}" removed`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Remove failed');
    }
  };

  if (!user || user.role !== 'admin') return null;

  const selectedModule = selectedGoal?.modules.find((m) => m.moduleId === selectedModuleId);

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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-emerald">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin Only — No AI Generation
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold">
              Manage Quest &amp; Interview Questions
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Assign, create, edit, and remove questions within quest modules and interview preparation paths.
              All content is manually curated by admins only.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> New Question
            </button>
          </div>
        </div>
      </header>

      {/* RBAC Notice */}
      <div className="glass mb-4 border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-center gap-2 text-xs text-amber-300">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Role-Based Access Control:</strong> Only admins can manage questions. AI generation is completely disabled.
            Regular users can only view and solve assigned questions.
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="input-base pl-10"
          />
        </div>
        <select value={goalType} onChange={(e) => setGoalType(e.target.value)} className="input-base w-auto">
          {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-base w-auto">
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar: Templates list */}
        <aside className="space-y-2 max-h-[75vh] overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass h-16 animate-pulse" />
            ))
          ) : goals.length === 0 ? (
            <div className="glass p-6 text-center text-sm text-zinc-500">No templates found.</div>
          ) : (
            goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => { setSelectedGoal(goal); setSelectedModuleId(null); }}
                className={cn(
                  'glass w-full p-3 text-left transition hover:border-accent-emerald/30',
                  selectedGoal?.id === goal.id && 'border-accent-emerald/50 bg-accent-emerald/10'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{goal.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{goal.name}</div>
                    <div className="flex gap-1.5 text-[10px] text-zinc-500">
                      <span className="capitalize">{goal.goalType?.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>{goal.modules?.length ?? 0} modules</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                    className="rounded p-1 text-zinc-600 hover:bg-accent-rose/10 hover:text-accent-rose"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Main content */}
        {selectedGoal ? (
          <section className="space-y-4">
            {/* Template header */}
            <div className="glass p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedGoal.icon}</span>
                    <h2 className="font-display text-xl font-bold">{selectedGoal.name}</h2>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{selectedGoal.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400 capitalize">
                      {selectedGoal.goalType?.replace('_', ' ')}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                      {selectedGoal.category}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                      {selectedGoal.estimatedHours}h
                    </span>
                    {selectedGoal.companyTarget && (
                      <span className="rounded-full border border-accent-cyan/20 bg-accent-cyan/10 px-2 py-0.5 text-accent-cyan">
                        {selectedGoal.companyTarget}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditOpen(true)}
                  className="btn-ghost text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Template
                </button>
              </div>
            </div>

            {/* Modules list */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <BookOpen className="h-4 w-4" /> Modules & Questions
              </h3>
              {(selectedGoal.modules ?? []).map((mod) => (
                <div
                  key={mod.moduleId}
                  className={cn(
                    'glass p-4 transition',
                    selectedModuleId === mod.moduleId && 'border-accent-emerald/40 bg-accent-emerald/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setSelectedModuleId(
                        selectedModuleId === mod.moduleId ? null : mod.moduleId
                      )}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className={cn(
                          'h-4 w-4 text-zinc-500 transition-transform',
                          selectedModuleId === mod.moduleId && 'rotate-90'
                        )} />
                        <h4 className="font-display font-semibold">{mod.title}</h4>
                        <span className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          mod.difficulty === 'Easy' && 'border-accent-emerald/30 text-accent-emerald',
                          mod.difficulty === 'Medium' && 'border-amber-500/30 text-amber-300',
                          mod.difficulty === 'Hard' && 'border-accent-rose/30 text-accent-rose'
                        )}>
                          {mod.difficulty}
                        </span>
                      </div>
                      <p className="mt-1 pl-6 text-xs text-zinc-500">{mod.description}</p>
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                        {(mod.problemSlugs ?? []).length} questions
                      </span>
                      <button
                        onClick={() => { setSelectedModuleId(mod.moduleId); setAssignOpen(true); }}
                        className="rounded p-1 text-zinc-500 hover:bg-accent-emerald/10 hover:text-accent-emerald"
                        title="Assign question"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteModule(mod.moduleId)}
                        className="rounded p-1 text-zinc-600 hover:bg-accent-rose/10 hover:text-accent-rose"
                        title="Delete module"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Topics */}
                  {mod.topics && mod.topics.length > 0 && (
                    <div className="mt-2 pl-6 flex flex-wrap gap-1">
                      {mod.topics.map((topic) => (
                        <span key={topic} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded: show assigned problems */}
                  {selectedModuleId === mod.moduleId && (
                    <div className="mt-3 pl-6 space-y-2">
                      <div className="text-xs font-medium text-zinc-400">Assigned Questions:</div>
                      {(mod.problemSlugs ?? []).length === 0 ? (
                        <p className="text-xs text-zinc-600 italic">No questions assigned yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {(mod.problemSlugs ?? []).map((slug) => (
                            <div
                              key={slug}
                              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                            >
                              <Link
                                href={`/solve/${slug}`}
                                className="text-sm font-medium text-accent-violet hover:text-accent-fuchsia"
                              >
                                {slug}
                              </Link>
                              <button
                                onClick={() => removeProblem(mod.moduleId, slug)}
                                className="rounded p-1 text-zinc-600 hover:bg-accent-rose/10 hover:text-accent-rose"
                                title="Remove question"
                              >
                                <Unlink className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setAssignOpen(true)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent-emerald/20 bg-accent-emerald/5 px-3 py-1.5 text-xs font-medium text-accent-emerald hover:bg-accent-emerald/10 transition"
                      >
                        <Plus className="h-3 w-3" /> Assign Question
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {(selectedGoal.modules ?? []).length === 0 && (
                <div className="glass p-6 text-center text-sm text-zinc-500">
                  No modules in this template. Add modules from the Interview Questions page.
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="glass flex min-h-[300px] items-center justify-center text-sm text-zinc-500">
            {loading ? 'Loading...' : 'Select a template to manage its questions'}
          </div>
        )}
      </div>

      {/* Assign Problem Modal */}
      <Modal
        open={assignOpen}
        onClose={() => { setAssignOpen(false); setProblemResults([]); setProblemSearch(''); }}
        size="lg"
        title="Assign Question to Module"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-accent-emerald/20 bg-accent-emerald/5 p-3 text-xs text-accent-emerald">
            Assigning to: <strong>{selectedModule?.title ?? 'Unknown module'}</strong> in{' '}
            <strong>{selectedGoal?.name}</strong>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchProblems()}
                placeholder="Search problems by title or slug..."
                className="input-base pl-10"
              />
            </div>
            <button
              onClick={searchProblems}
              disabled={searchingProblems}
              className="btn-primary"
            >
              {searchingProblems ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </div>

          {problemResults.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {problemResults.map((p) => {
                const alreadyAssigned = (selectedModule?.problemSlugs ?? []).includes(p.slug);
                return (
                  <div
                    key={p.slug}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className={cn(
                          p.difficulty === 'Easy' && 'text-accent-emerald',
                          p.difficulty === 'Medium' && 'text-amber-300',
                          p.difficulty === 'Hard' && 'text-accent-rose',
                        )}>
                          {p.difficulty}
                        </span>
                        <span>{p.slug}</span>
                        {(p.companyTags ?? []).length > 0 && (
                          <span>· {p.companyTags.slice(0, 3).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => assignProblem(p.slug)}
                      disabled={assigning || alreadyAssigned}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                        alreadyAssigned
                          ? 'bg-white/5 text-zinc-500 cursor-not-allowed'
                          : 'bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20'
                      )}
                    >
                      {alreadyAssigned ? 'Assigned' : 'Assign'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Create Question Modal */}
      <CreateQuestionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); toast.success('Question created! You can now assign it to modules.'); }}
      />

      {/* Edit Template Modal */}
      {editOpen && selectedGoal && (
        <EditTemplateDialog
          goal={selectedGoal}
          onClose={() => setEditOpen(false)}
          onUpdated={() => { setEditOpen(false); refreshGoal(selectedGoal.id); }}
        />
      )}
    </AppShell>
  );
}

/* ────────────────────── Create Question Dialog ────────────────────── */
function CreateQuestionDialog({
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
      onCreated();
      setForm({ slug: '', title: '', description: '', difficulty: 'Medium', tags: '', companyTags: '', inputFormat: '', outputFormat: '', constraints: '' });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Create New Question (Admin)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
          <strong>Admin Only:</strong> AI generation is completely disabled. All questions must be manually authored.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="two-sum"
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Two Sum"
              className="input-base"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Description (Markdown) *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="input-base resize-y"
            required
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
            <label className="mb-1 block text-sm font-medium text-zinc-300">Tags (comma-sep)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="array, hash-table"
              className="input-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Companies (comma-sep)</label>
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
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Question'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ────────────────────── Edit Template Dialog ────────────────────── */
function EditTemplateDialog({
  goal,
  onClose,
  onUpdated,
}: {
  goal: Goal;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: goal.name,
    icon: goal.icon ?? '🎯',
    description: goal.description ?? '',
    topic: goal.topic ?? '',
    difficulty: goal.difficulty ?? 'Intermediate',
    goalType: goal.goalType ?? 'quest',
    category: goal.category ?? 'dsa',
    estimatedHours: String(goal.estimatedHours ?? 20),
    xpReward: String(goal.xpReward ?? 200),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api(`/admin/recommended-goals/${goal.id}`, {
        method: 'PATCH',
        auth: true,
        body: {
          name: form.name,
          icon: form.icon,
          description: form.description,
          topic: form.topic,
          difficulty: form.difficulty,
          goalType: form.goalType,
          category: form.category,
          estimatedHours: Number(form.estimatedHours) || 20,
          xpReward: Number(form.xpReward) || 200,
        },
      });
      toast.success('Template updated');
      onUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" title="Edit Template (Admin)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[60px_1fr] gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Icon</label>
            <input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="input-base text-center text-lg"
              maxLength={4}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-base"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="input-base resize-y"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Type</label>
            <select
              value={form.goalType}
              onChange={(e) => setForm({ ...form, goalType: e.target.value as GoalType })}
              className="input-base"
            >
              <option value="quest">Quest</option>
              <option value="recommended">Recommended</option>
              <option value="company_prep">Company Prep</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as GoalCategory })}
              className="input-base"
            >
              <option value="dsa">DSA</option>
              <option value="system_design">System Design</option>
              <option value="sql">SQL</option>
              <option value="dbms">DBMS</option>
              <option value="fullstack">Full Stack</option>
              <option value="ai_ml">AI/ML</option>
              <option value="aptitude">Aptitude</option>
              <option value="company">Company</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
              className="input-base"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Master">Master</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Est. Hours</label>
            <input
              type="number" min="1"
              value={form.estimatedHours}
              onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
              className="input-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">XP Reward</label>
            <input
              type="number" min="0"
              value={form.xpReward}
              onChange={(e) => setForm({ ...form, xpReward: e.target.value })}
              className="input-base"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
