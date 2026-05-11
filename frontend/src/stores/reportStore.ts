import { create } from 'zustand';
import { api } from '@/lib/api';
import type { WeeklyReport, DashboardReport, GoalReport } from '@/types/report';

interface ReportState {
  weeklyReport: WeeklyReport | null;
  dashboardReport: DashboardReport | null;
  goalReports: Record<string, GoalReport>;
  loading: boolean;

  fetchWeekly: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  fetchGoalReport: (goalId: string) => Promise<GoalReport | null>;
}

export const useReports = create<ReportState>((set, get) => ({
  weeklyReport: null,
  dashboardReport: null,
  goalReports: {},
  loading: false,

  async fetchWeekly() {
    set({ loading: true });
    try {
      const data = await api<{ report: WeeklyReport }>('/reports/weekly', { auth: true });
      set({ weeklyReport: data.report });
    } catch {
      // silently fail — reports are non-critical
    } finally {
      set({ loading: false });
    }
  },

  async fetchDashboard() {
    set({ loading: true });
    try {
      const data = await api<{ report: DashboardReport }>('/reports/dashboard', { auth: true });
      set({ dashboardReport: data.report });
    } catch {
      // silently fail
    } finally {
      set({ loading: false });
    }
  },

  async fetchGoalReport(goalId: string) {
    try {
      const data = await api<{ report: GoalReport }>(`/reports/goal/${goalId}`, { auth: true });
      set((s) => ({
        goalReports: { ...s.goalReports, [goalId]: data.report },
      }));
      return data.report;
    } catch {
      return null;
    }
  },
}));
