import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Goal, ModuleStatus } from '@/types/goal';

interface GoalState {
  goals: Goal[];
  loading: boolean;
  loaded: boolean;
  fetch: () => Promise<void>;
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
}

export const useGoals = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,
  loaded: false,

  async fetch() {
    set({ loading: true });
    try {
      const res = await api<{ goals: Goal[] }>('/goals', { auth: true });
      set({ goals: res.goals, loaded: true });
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
}));

function sortGoals(goals: Goal[]): Goal[] {
  const priorityRank = { P0: 0, P1: 1, P2: 2 } as const;
  return [...goals].sort((a, b) => {
    if (a.isFocus !== b.isFocus) return a.isFocus ? -1 : 1;
    if (a.priority !== b.priority) return priorityRank[a.priority] - priorityRank[b.priority];
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}
