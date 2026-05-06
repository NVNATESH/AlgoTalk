import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PomodoroMode = 'work' | 'short_break' | 'long_break';
export type PomodoroStatus = 'idle' | 'running' | 'paused';

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  notifications: boolean;
  sound: boolean;
}

export interface PomodoroScope {
  goalId: string;
  goalName: string;
  goalIcon: string;
  moduleId?: string;
  moduleTitle?: string;
}

export interface PomodoroState {
  status: PomodoroStatus;
  mode: PomodoroMode;
  // Wall-clock anchor: when running, secondsLeft is recomputed from this.
  endsAt: number | null; // ms epoch when current run will end
  pausedAt: number | null; // ms epoch when paused (so resume re-anchors)
  remainingMs: number; // last-known remaining ms (used when paused/idle)
  totalSeconds: number; // total seconds for the current cycle

  scope: PomodoroScope | null;

  completedWorkCycles: number; // since last reset
  workSessionsToday: number; // for streak-y feel; reset on a fresh local day
  workSessionsTodayDate: string; // YYYY-MM-DD

  settings: PomodoroSettings;

  // session bookkeeping
  workStartedAt: number | null;
  lastIdleNudgeAt: number | null;

  // actions
  start: (scope: PomodoroScope) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  setMode: (mode: PomodoroMode) => void;
  setScope: (scope: PomodoroScope | null) => void;
  updateSettings: (patch: Partial<PomodoroSettings>) => void;
  // internal: invoked by provider tick when timer reaches 0
  finalize: (opts: { onWorkComplete?: (mins: number, scope: PomodoroScope) => void }) => void;
  // recompute remainingMs from endsAt; call from tick
  tick: () => void;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesUntilLongBreak: 4,
  autoStartBreaks: true,
  autoStartWork: false,
  notifications: true,
  sound: true,
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const totalSecondsFor = (mode: PomodoroMode, settings: PomodoroSettings) => {
  switch (mode) {
    case 'work':
      return settings.workMinutes * 60;
    case 'short_break':
      return settings.shortBreakMinutes * 60;
    case 'long_break':
      return settings.longBreakMinutes * 60;
  }
};

export const usePomodoro = create<PomodoroState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      mode: 'work',
      endsAt: null,
      pausedAt: null,
      remainingMs: DEFAULT_SETTINGS.workMinutes * 60_000,
      totalSeconds: DEFAULT_SETTINGS.workMinutes * 60,

      scope: null,

      completedWorkCycles: 0,
      workSessionsToday: 0,
      workSessionsTodayDate: todayKey(),

      settings: DEFAULT_SETTINGS,

      workStartedAt: null,
      lastIdleNudgeAt: null,

      start: (scope) => {
        const s = get();
        const total = totalSecondsFor(s.mode, s.settings);
        const ms = total * 1000;
        set({
          scope: scope ?? s.scope,
          status: 'running',
          totalSeconds: total,
          remainingMs: ms,
          endsAt: Date.now() + ms,
          pausedAt: null,
          workStartedAt: s.mode === 'work' ? Date.now() : s.workStartedAt,
        });
      },

      pause: () => {
        const s = get();
        if (s.status !== 'running' || s.endsAt == null) return;
        const remaining = Math.max(0, s.endsAt - Date.now());
        set({
          status: 'paused',
          remainingMs: remaining,
          pausedAt: Date.now(),
          endsAt: null,
        });
      },

      resume: () => {
        const s = get();
        if (s.status !== 'paused') return;
        set({
          status: 'running',
          endsAt: Date.now() + s.remainingMs,
          pausedAt: null,
        });
      },

      reset: () => {
        const s = get();
        const total = totalSecondsFor(s.mode, s.settings);
        set({
          status: 'idle',
          totalSeconds: total,
          remainingMs: total * 1000,
          endsAt: null,
          pausedAt: null,
          workStartedAt: null,
        });
      },

      skip: () => {
        // jump to end of current cycle without logging time (manual skip)
        const s = get();
        set({ remainingMs: 0, endsAt: Date.now() });
      },

      setMode: (mode) => {
        const s = get();
        const total = totalSecondsFor(mode, s.settings);
        set({
          mode,
          status: 'idle',
          totalSeconds: total,
          remainingMs: total * 1000,
          endsAt: null,
          pausedAt: null,
        });
      },

      setScope: (scope) => set({ scope }),

      updateSettings: (patch) => {
        const s = get();
        const next = { ...s.settings, ...patch };
        set({ settings: next });
        // if idle, refresh totals to reflect new minutes
        if (s.status === 'idle') {
          const total = totalSecondsFor(s.mode, next);
          set({ totalSeconds: total, remainingMs: total * 1000 });
        }
      },

      finalize: ({ onWorkComplete }) => {
        const s = get();
        const finishedMode = s.mode;
        const dayKey = todayKey();
        let { completedWorkCycles, workSessionsToday, workSessionsTodayDate } = s;

        if (workSessionsTodayDate !== dayKey) {
          workSessionsToday = 0;
          workSessionsTodayDate = dayKey;
        }

        let nextMode: PomodoroMode = 'work';

        if (finishedMode === 'work') {
          completedWorkCycles += 1;
          workSessionsToday += 1;
          if (completedWorkCycles % s.settings.cyclesUntilLongBreak === 0) {
            nextMode = 'long_break';
          } else {
            nextMode = 'short_break';
          }
          if (s.scope && onWorkComplete) {
            try {
              onWorkComplete(s.settings.workMinutes, s.scope);
            } catch {
              // ignore
            }
          }
        } else {
          nextMode = 'work';
        }

        const nextTotal = totalSecondsFor(nextMode, s.settings);
        const nextMs = nextTotal * 1000;
        const shouldAutoStart =
          (finishedMode === 'work' && s.settings.autoStartBreaks) ||
          (finishedMode !== 'work' && s.settings.autoStartWork);

        set({
          mode: nextMode,
          totalSeconds: nextTotal,
          remainingMs: nextMs,
          endsAt: shouldAutoStart ? Date.now() + nextMs : null,
          pausedAt: null,
          status: shouldAutoStart ? 'running' : 'idle',
          completedWorkCycles,
          workSessionsToday,
          workSessionsTodayDate,
          workStartedAt: shouldAutoStart && nextMode === 'work' ? Date.now() : null,
        });
      },

      tick: () => {
        const s = get();
        if (s.status !== 'running' || s.endsAt == null) return;
        const remaining = Math.max(0, s.endsAt - Date.now());
        if (remaining === s.remainingMs) return;
        set({ remainingMs: remaining });
      },
    }),
    {
      name: 'learnhub.pomodoro.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        status: s.status,
        mode: s.mode,
        endsAt: s.endsAt,
        pausedAt: s.pausedAt,
        remainingMs: s.remainingMs,
        totalSeconds: s.totalSeconds,
        scope: s.scope,
        completedWorkCycles: s.completedWorkCycles,
        workSessionsToday: s.workSessionsToday,
        workSessionsTodayDate: s.workSessionsTodayDate,
        settings: s.settings,
        workStartedAt: s.workStartedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Day rollover for sessionsToday
        const dayKey = todayKey();
        if (state.workSessionsTodayDate !== dayKey) {
          state.workSessionsToday = 0;
          state.workSessionsTodayDate = dayKey;
        }
        // If we were running, recompute remainingMs from wall clock
        if (state.status === 'running' && state.endsAt != null) {
          state.remainingMs = Math.max(0, state.endsAt - Date.now());
          // Note: provider's first tick will fire finalize() if remainingMs == 0
        }
      },
    }
  )
);

export const formatTime = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const modeLabel = (m: PomodoroMode): string =>
  ({ work: 'Focus', short_break: 'Short break', long_break: 'Long break' }[m]);

export const modeEmoji = (m: PomodoroMode): string =>
  ({ work: '🎯', short_break: '☕', long_break: '🌿' }[m]);
