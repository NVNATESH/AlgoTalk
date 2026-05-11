'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import type { Goal } from '@/types/goal';

interface GoalListResponse {
  goals: Goal[];
  total: number;
}

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

const GOAL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'quest', label: 'Quest' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'company_prep', label: 'Company Prep' },
];

export default function AdminInterviewQuestionsPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [goalType, setGoalType] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Module form state
  const [moduleForm, setModuleForm] = useState({
    title: '', description: '', topics: '', difficulty: 'Medium', estimatedHours: '2',
  });
  const [savingModule, setSavingModule] = useState(false);
  const [topicForm, setTopicForm] = useState({ moduleId: '', topic: '' });
  const [savingTopic, setSavingTopic] = useState(false);

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
      if (category) params.set('category', category);
      if (goalType) params.set('goalType', goalType);
      params.set('limit', '100');
      const res = await api<GoalListResponse>(`/admin/recommended-goals?${params}`, { auth: true });
      setGoals(res.goals);
      if (!selectedGoal && res.goals.length > 0) setSelectedGoal(res.goals[0]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search, category, goalType]);

  useEffect(() => {
    if (user?.role === 'admin') fetchGoals();
  }, [user?.role, fetchGoals]);

  const handleDelete = async (goalId: string) => {
    if (!confirm('Delete this interview question template? This cannot be undone.')) return;
    try {
      await api(`/admin/recommended-goals/${goalId}`, { method: 'DELETE', auth: true });
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      if (selectedGoal?.id === goalId) setSelectedGoal(null);
      toast.success('Template deleted');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const addModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    setSavingModule(true);
    try {
      const res = await api<{ goal: Goal }>(`/admin/recommended-goals/${selectedGoal.id}/modules`, {
        method: 'POST',
        auth: true,
        body: {
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
          topics: moduleForm.topics.split(',').map((t) => t.trim()).filter(Boolean),
          difficulty: moduleForm.difficulty,
          estimatedHours: Number(moduleForm.estimatedHours) || 1,
        },
      });
      const updated = res.goal;
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setSelectedGoal(updated);
      setModuleForm({ title: '', description: '', topics: '', difficulty: 'Medium', estimatedHours: '2' });
      toast.success('Module added');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to add module');
    } finally {
      setSavingModule(false);
    }
  };

  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !topicForm.moduleId) return;
    setSavingTopic(true);
    try {
      const res = await api<{ goal: Goal }>(
        `/admin/recommended-goals/${selectedGoal.id}/modules/${topicForm.moduleId}/topics`,
        { method: 'POST', auth: true, body: { topic: topicForm.topic.trim() } }
      );
      const updated = res.goal;
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setSelectedGoal(updated);
      setTopicForm((f) => ({ ...f, topic: '' }));
      toast.success('Topic added');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to add topic');
    } finally {
      setSavingTopic(false);
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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin Only — No AI Generation
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold">Interview &amp; Quest Questions</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage quest templates and interview preparation paths. All content is manually curated by admins.
            </p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Create Template
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
            placeholder="Search templates..."
            className="input-base pl-10"
          />
        </div>
        <select
          value={goalType}
          onChange={(e) => setGoalType(e.target.value)}
          className="input-base w-auto"
        >
          {GOAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-base w-auto"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="space-y-2 max-h-[70vh] overflow-y-auto">
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
                onClick={() => setSelectedGoal(goal)}
                className={cn(
                  'glass w-full p-3 text-left transition hover:border-accent-violet/30',
                  selectedGoal?.id === goal.id && 'border-accent-violet/50 bg-accent-violet/10'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{goal.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{goal.name}</div>
                    <div className="flex gap-1.5 text-[10px] text-zinc-500">
                      <span>{goal.goalType}</span>
                      <span>·</span>
                      <span>{goal.modules.length} modules</span>
                      <span>·</span>
                      <span>{goal.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }}
                    className="rounded p-1 text-zinc-600 hover:bg-accent-rose/10 hover:text-accent-rose"
                    title="Delete template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Detail panel */}
        {selectedGoal ? (
          <section className="space-y-5">
            <div className="glass p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedGoal.icon}</span>
                    <h2 className="font-display text-xl font-bold">{selectedGoal.name}</h2>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm text-zinc-400">{selectedGoal.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                      {selectedGoal.goalType}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                      {selectedGoal.category}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
                      {selectedGoal.estimatedHours}h
                    </span>
                    <span className="rounded-full border border-accent-violet/20 bg-accent-violet/10 px-2 py-0.5 text-accent-violet">
                      {selectedGoal.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Add module / topic forms */}
            <div className="grid gap-5 xl:grid-cols-2">
              <form onSubmit={addModule} className="glass p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                  <Plus className="h-4 w-4 text-accent-emerald" /> Add Module
                </h3>
                <div className="space-y-2">
                  <input
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Module title"
                    className="input-base"
                    required
                  />
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description"
                    className="input-base min-h-16 resize-y"
                  />
                  <input
                    value={moduleForm.topics}
                    onChange={(e) => setModuleForm((f) => ({ ...f, topics: e.target.value }))}
                    placeholder="Topics, comma separated"
                    className="input-base"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={moduleForm.difficulty}
                      onChange={(e) => setModuleForm((f) => ({ ...f, difficulty: e.target.value }))}
                      className="input-base"
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                    <input
                      type="number" min="0.25" step="0.25"
                      value={moduleForm.estimatedHours}
                      onChange={(e) => setModuleForm((f) => ({ ...f, estimatedHours: e.target.value }))}
                      placeholder="Hours"
                      className="input-base"
                    />
                  </div>
                  <button type="submit" disabled={savingModule} className="btn-primary w-full">
                    {savingModule ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Module'}
                  </button>
                </div>
              </form>

              <form onSubmit={addTopic} className="glass p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                  <Tags className="h-4 w-4 text-accent-cyan" /> Add Topic to Module
                </h3>
                <div className="space-y-2">
                  <select
                    value={topicForm.moduleId}
                    onChange={(e) => setTopicForm((f) => ({ ...f, moduleId: e.target.value }))}
                    className="input-base"
                    required
                  >
                    <option value="">Select module</option>
                    {selectedGoal.modules.map((m) => (
                      <option key={m.moduleId} value={m.moduleId}>{m.title}</option>
                    ))}
                  </select>
                  <input
                    value={topicForm.topic}
                    onChange={(e) => setTopicForm((f) => ({ ...f, topic: e.target.value }))}
                    placeholder="New topic"
                    className="input-base"
                    required
                  />
                  <button type="submit" disabled={savingTopic} className="btn-primary w-full">
                    {savingTopic ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Topic'}
                  </button>
                </div>
              </form>
            </div>

            {/* Modules display */}
            <div className="space-y-3">
              {selectedGoal.modules.map((mod) => (
                <div key={mod.moduleId} className="glass p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 font-display font-semibold">
                        <BookOpen className="h-4 w-4 text-accent-violet" /> {mod.title}
                      </h4>
                      <p className="mt-1 text-sm text-zinc-500">{mod.description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
                      {mod.difficulty} · {mod.estimatedHours}h
                    </span>
                  </div>
                  {mod.topics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mod.topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-400"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {selectedGoal.modules.length === 0 && (
                <div className="glass p-6 text-center text-sm text-zinc-500">
                  No modules yet. Add one above.
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="glass flex min-h-[300px] items-center justify-center text-sm text-zinc-500">
            {loading ? 'Loading...' : 'Select a template to view details'}
          </div>
        )}
      </div>

      <CreateTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); fetchGoals(); }}
      />
    </AppShell>
  );
}

/* ────────────────────── Create Template Dialog ────────────────────── */
function CreateTemplateDialog({
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
    name: '',
    icon: '🎯',
    description: '',
    topic: '',
    difficulty: 'Intermediate' as string,
    goalType: 'quest' as string,
    category: 'dsa' as string,
    estimatedHours: '20',
    xpReward: '200',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.topic) {
      toast.error('Name and topic are required');
      return;
    }
    setSubmitting(true);
    try {
      await api('/admin/recommended-goals', {
        method: 'POST',
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
      toast.success('Template created!');
      onCreated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Create Quest / Interview Template (Admin)">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
          <strong>Admin Only:</strong> AI generation is completely disabled. All interview and quest content must be manually authored.
        </div>
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
              placeholder="Striver DSA Sheet"
              className="input-base"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Topic</label>
          <input
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Data Structures & Algorithms"
            className="input-base"
            required
          />
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
              onChange={(e) => setForm({ ...form, goalType: e.target.value })}
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
              onChange={(e) => setForm({ ...form, category: e.target.value })}
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
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Template'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
