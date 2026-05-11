import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Goal, ModuleStatus } from '@/types/goal';

interface GoalState {
  goals: Goal[];
  loading: boolean;
  loaded: boolean;
  lastFetchAt: number;

  recommended: Goal[];
  recommendedLoaded: boolean;
  recommendedLoading: boolean;

  quests: Goal[];
  questTemplates: Goal[];
  questsLoaded: boolean;

  fetch: (opts?: { force?: boolean }) => Promise<void>;
  upsert: (goal: Goal) => void;
  remove: (id: string) => void;
  create: (input: {
    topic: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
    weeklyHours?: number;
    deadlineDays?: number;
    priority?: 'P0' | 'P1' | 'P2';
    notes?: string;
  }) => Promise<Goal>;
  setFocus: (id: string) => Promise<Goal>;
  unfocus: (id: string) => Promise<Goal>;
  pause: (id: string, paused: boolean) => Promise<Goal>;
  archive: (id: string) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  updateModule: (goalId: string, moduleId: string, status: ModuleStatus) => Promise<Goal>;
  getById: (id: string) => Goal | undefined;

  // Unified system
  fetchRecommended: (opts?: { category?: string; goalType?: string; company?: string; search?: string }) => Promise<void>;
  enrollInGoal: (templateId: string, opts?: { deadlineDays?: number; weeklyHours?: number }) => Promise<Goal>;
  fetchQuests: () => Promise<void>;
  fetchCompanyGoals: (company: string) => Promise<{ userGoals: Goal[]; templates: Goal[] }>;
}

export const useGoals = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,
  loaded: false,
  lastFetchAt: 0,

  recommended: [],
  recommendedLoaded: false,
  recommendedLoading: false,

  quests: [],
  questTemplates: [],
  questsLoaded: false,

  async fetch(opts) {
    const state = get();
    // Skip refetch if we have data younger than 30s. Forces a refetch when caller passes `force: true`.
    if (!opts?.force && state.loaded && Date.now() - state.lastFetchAt < 30_000) return;
    if (state.loading) return;
    set({ loading: true });
    try {
      const res = await api<{ goals: Goal[] }>('/goals', { auth: true });
      set({ goals: res.goals, loaded: true, lastFetchAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },

  upsert(goal) {
    set((state) => {
      const existing = state.goals.findIndex((g) => g.id === goal.id);
      const next = [...state.goals];
      if (existing >= 0) next[existing] = goal;
      else next.unshift(goal);
      return { goals: sortGoals(next) };
    });
  },

  remove(id) {
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
  },

  async create(input) {
    const res = await api<{ goal: Goal }>('/goals', { method: 'POST', body: input, auth: true });
    get().upsert(res.goal);
    return res.goal;
  },

  async setFocus(id) {
    const res = await api<{ goal: Goal }>(`/goals/${id}/focus`, { method: 'POST', auth: true });
    set((state) => ({
      goals: sortGoals(
        state.goals.map((g) => (g.id === res.goal.id ? res.goal : { ...g, isFocus: false }))
      ),
    }));
    return res.goal;
  },

  async unfocus(id) {
    const res = await api<{ goal: Goal }>(`/goals/${id}/unfocus`, { method: 'POST', auth: true });
    get().upsert(res.goal);
    return res.goal;
  },

  async pause(id, paused) {
    const res = await api<{ goal: Goal }>(`/goals/${id}/pause`, {
      method: 'POST',
      body: { paused },
      auth: true,
    });
    get().upsert(res.goal);
    return res.goal;
  },

  async archive(id) {
    const res = await api<{ goal: Goal }>(`/goals/${id}/archive`, { method: 'POST', auth: true });
    get().upsert(res.goal);
    return res.goal;
  },

  async deleteGoal(id) {
    await api(`/goals/${id}`, { method: 'DELETE', auth: true });
    get().remove(id);
  },

  async updateModule(goalId, moduleId, status) {
    const res = await api<{ goal: Goal }>(`/goals/${goalId}/modules/${moduleId}`, {
      method: 'PATCH',
      body: { status },
      auth: true,
    });
    get().upsert(res.goal);
    return res.goal;
  },

  getById(id) {
    return get().goals.find((g) => g.id === id);
  },

  // === Unified system ===

  async fetchRecommended(opts) {
    if (get().recommendedLoading) return;
    set({ recommendedLoading: true });
    try {
      const params = new URLSearchParams();
      if (opts?.category) params.set('category', opts.category);
      if (opts?.goalType) params.set('goalType', opts.goalType);
      if (opts?.company) params.set('company', opts.company);
      if (opts?.search) params.set('search', opts.search);
      const res = await api<{ goals: Goal[] }>(`/goals/recommended?${params.toString()}`, { auth: true });
      set({ recommended: res.goals, recommendedLoaded: true });
    } finally {
      set({ recommendedLoading: false });
    }
  },

  async enrollInGoal(templateId, opts) {
    const res = await api<{ goal: Goal; alreadyEnrolled: boolean }>(
      `/goals/recommended/${templateId}/enroll`,
      { method: 'POST', body: opts ?? {}, auth: true }
    );
    get().upsert(res.goal);
    // Update recommended list to mark as enrolled
    set((state) => ({
      recommended: state.recommended.map(g =>
        g.id === templateId ? { ...g, enrolled: true } : g
      ),
    }));
    return res.goal;
  },

  async fetchQuests() {
    const res = await api<{ userQuests: Goal[]; templates: Goal[] }>('/goals/quests', { auth: true });
    set({ quests: res.userQuests, questTemplates: res.templates, questsLoaded: true });
  },

  async fetchCompanyGoals(company) {
    const res = await api<{ company: string; userGoals: Goal[]; templates: Goal[] }>(
      `/goals/company/${encodeURIComponent(company)}`,
      { auth: true }
    );
    return { userGoals: res.userGoals, templates: res.templates };
  },
}));

function sortGoals(goals: Goal[]): Goal[] {
  const priorityRank = { P0: 0, P1: 1, P2: 2 } as const;
  return [...goals].sort((a, b) => {
    if (a.isFocus !== b.isFocus) return a.isFocus ? -1 : 1;
    if (a.priority !== b.priority) return priorityRank[a.priority] - priorityRank[b.priority];
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}
