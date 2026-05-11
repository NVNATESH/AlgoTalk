'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ListPlus, Loader2, Plus, Search, ShieldCheck, Tags, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
import type { Goal } from '@/types/goal';
import { cn } from '@/lib/utils';

interface AdminGoalResponse {
  goal: Goal;
}

interface AdminGoalListResponse {
  goals: Goal[];
  total: number;
}

const EMPTY_MODULE = {
  title: '',
  description: '',
  topics: '',
  difficulty: 'Medium',
  estimatedHours: '2',
};

export default function AdminRecommendedGoalsPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingModule, setSavingModule] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [moduleForm, setModuleForm] = useState(EMPTY_MODULE);
  const [topicForm, setTopicForm] = useState({ moduleId: '', topic: '' });

  const fetchTemplates = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      const res = await api<AdminGoalListResponse>(`/admin/recommended-goals?${params}`, {
        auth: true,
      });
      setGoals(res.goals);
      setSelectedId((current) => current || res.goals[0]?.id || '');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (user?.role !== 'admin') {
      toast.error('Admin access required');
      router.replace('/dashboard');
      return;
    }
    fetchTemplates();
  }, [fetchTemplates, hydrated, router, user?.role]);

  const selected = useMemo(
    () => goals.find((goal) => goal.id === selectedId) ?? goals[0],
    [goals, selectedId]
  );

  const replaceGoal = (goal: Goal) => {
    setGoals((items) => items.map((item) => (item.id === goal.id ? goal : item)));
    setSelectedId(goal.id);
  };

  const addModule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const topics = moduleForm.topics
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean);

    setSavingModule(true);
    try {
      const res = await api<AdminGoalResponse>(`/admin/recommended-goals/${selected.id}/modules`, {
        method: 'POST',
        auth: true,
        body: {
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
          topics,
          difficulty: moduleForm.difficulty,
          estimatedHours: Number(moduleForm.estimatedHours) || 1,
        },
      });
      replaceGoal(res.goal);
      setModuleForm(EMPTY_MODULE);
      toast.success('Module added');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to add module');
    } finally {
      setSavingModule(false);
    }
  };

  const addTopic = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !topicForm.moduleId) return;
    setSavingTopic(true);
    try {
      const res = await api<AdminGoalResponse>(
        `/admin/recommended-goals/${selected.id}/modules/${topicForm.moduleId}/topics`,
        {
          method: 'POST',
          auth: true,
          body: { topic: topicForm.topic.trim() },
        }
      );
      replaceGoal(res.goal);
      setTopicForm((current) => ({ ...current, topic: '' }));
      toast.success('Topic added');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to add topic');
    } finally {
      setSavingTopic(false);
    }
  };

  if (!hydrated || user?.role !== 'admin') {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Admin Hub
        </Link>
      </div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">
            Recommended Goal Templates
          </h1>
        </div>
        <form
          className="relative w-full max-w-sm"
          onSubmit={(event) => {
            event.preventDefault();
            fetchTemplates(search);
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates"
            className="input-base pl-9"
          />
        </form>
      </header>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass h-20 animate-pulse" />
            ))
          ) : (
            goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => setSelectedId(goal.id)}
                className={cn(
                  'glass w-full p-4 text-left transition hover:border-accent-violet/30',
                  selected?.id === goal.id && 'border-accent-violet/50 bg-accent-violet/10'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
                    {goal.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-semibold">{goal.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-zinc-500">
                      <span>{goal.goalType}</span>
                      <span>|</span>
                      <span>{goal.modules.length} modules</span>
                      <span>|</span>
                      <span>{goal.category}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </aside>

        {selected ? (
          <section className="space-y-5">
            <div className="glass p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{selected.name}</h2>
                  <p className="mt-1 max-w-3xl text-sm text-zinc-400">{selected.description}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
                  {selected.estimatedHours}h | {selected.xpReward} XP
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <form onSubmit={addModule} className="glass p-5">
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                  <ListPlus className="h-4 w-4 text-accent-emerald" /> Add Module
                </h3>
                <div className="space-y-3">
                  <input
                    value={moduleForm.title}
                    onChange={(event) => setModuleForm((form) => ({ ...form, title: event.target.value }))}
                    placeholder="Module title"
                    className="input-base"
                    required
                  />
                  <textarea
                    value={moduleForm.description}
                    onChange={(event) =>
                      setModuleForm((form) => ({ ...form, description: event.target.value }))
                    }
                    placeholder="Module description"
                    className="input-base min-h-24 resize-y"
                  />
                  <input
                    value={moduleForm.topics}
                    onChange={(event) => setModuleForm((form) => ({ ...form, topics: event.target.value }))}
                    placeholder="Topics, comma separated"
                    className="input-base"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={moduleForm.difficulty}
                      onChange={(event) =>
                        setModuleForm((form) => ({ ...form, difficulty: event.target.value }))
                      }
                      className="input-base"
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={moduleForm.estimatedHours}
                      onChange={(event) =>
                        setModuleForm((form) => ({ ...form, estimatedHours: event.target.value }))
                      }
                      className="input-base"
                    />
                  </div>
                  <button type="submit" disabled={savingModule} className="btn-primary w-full">
                    {savingModule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add module
                  </button>
                </div>
              </form>

              <form onSubmit={addTopic} className="glass p-5">
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                  <Tags className="h-4 w-4 text-accent-cyan" /> Add Topic
                </h3>
                <div className="space-y-3">
                  <select
                    value={topicForm.moduleId}
                    onChange={(event) =>
                      setTopicForm((form) => ({ ...form, moduleId: event.target.value }))
                    }
                    className="input-base"
                    required
                  >
                    <option value="">Choose module</option>
                    {selected.modules.map((module) => (
                      <option key={module.moduleId} value={module.moduleId}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                  <input
                    value={topicForm.topic}
                    onChange={(event) => setTopicForm((form) => ({ ...form, topic: event.target.value }))}
                    placeholder="New topic"
                    className="input-base"
                    required
                  />
                  <button type="submit" disabled={savingTopic} className="btn-primary w-full">
                    {savingTopic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add topic
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-3">
              {selected.modules.map((module) => (
                <div key={module.moduleId} className="glass p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 font-display font-semibold">
                        <BookOpen className="h-4 w-4 text-accent-violet" /> {module.title}
                      </h4>
                      <p className="mt-1 text-sm text-zinc-500">{module.description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase text-zinc-400">
                      {module.difficulty} | {module.estimatedHours}h
                    </span>
                  </div>
                  {module.topics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {module.topics.map((topic) => (
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
            </div>
          </section>
        ) : (
          <div className="glass flex min-h-[360px] items-center justify-center p-8 text-zinc-500">
            No templates found.
          </div>
        )}
      </div>
    </AppShell>
  );
}
