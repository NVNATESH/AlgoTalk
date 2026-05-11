'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { usePomodoro, formatTime, modeEmoji, modeLabel, type PomodoroScope } from '@/stores/pomodoroStore';
import { api } from '@/lib/api';
import { useGoals } from '@/stores/goalStore';
import type { Goal } from '@/types/goal';

const IDLE_THRESHOLD_MS = 60_000;

let _audioCtx: AudioContext | null = null;
function chime() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!Ctx) return;
    if (!_audioCtx) _audioCtx = new Ctx();
    const ctx = _audioCtx;
    const now = ctx.currentTime;
    // 5-second repeating alert: 5 two-tone bursts spaced 1 second apart
    for (let rep = 0; rep < 5; rep++) {
      const baseTime = now + rep * 1.0;
      [880, 1175].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.type = 'sine';
        g.gain.setValueAtTime(0, baseTime + i * 0.18);
        g.gain.linearRampToValueAtTime(0.22, baseTime + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, baseTime + i * 0.18 + 0.42);
        o.connect(g).connect(ctx.destination);
        o.start(baseTime + i * 0.18);
        o.stop(baseTime + i * 0.18 + 0.45);
      });
    }
  } catch {
    // ignore
  }
}

function tryNotify(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  } catch {
    // ignore
  }
}

/**
 * Mounts globally — drives the timer tick, idle detection, page-title updates,
 * and posts focus-time to the backend on work completion.
 */
export function PomodoroProvider() {
  const tick = usePomodoro((s) => s.tick);
  const finalize = usePomodoro((s) => s.finalize);
  const upsertGoal = useGoals((s) => s.upsert);
  const lastInteractionRef = useRef<number>(Date.now());
  const finalizingRef = useRef(false);

  // Keep "last interaction" updated
  useEffect(() => {
    const events: Array<keyof DocumentEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];
    const onAny = () => {
      lastInteractionRef.current = Date.now();
    };
    events.forEach((e) => document.addEventListener(e, onAny, { passive: true }));
    return () => events.forEach((e) => document.removeEventListener(e, onAny));
  }, []);

  // Visibility: if tab hidden, treat that as "potentially idle" by NOT updating interaction
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) {
        lastInteractionRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Tick loop (1s)
  useEffect(() => {
    const id = setInterval(() => {
      const s = usePomodoro.getState();

      if (s.status === 'running' && s.endsAt != null) {
        // idle auto-pause — only during work cycle
        if (s.mode === 'work') {
          const idleFor = Date.now() - lastInteractionRef.current;
          const tabHidden = typeof document !== 'undefined' && document.hidden;
          if (idleFor > IDLE_THRESHOLD_MS || tabHidden) {
            usePomodoro.getState().pause();
            if (Date.now() - (s.lastIdleNudgeAt ?? 0) > 30_000) {
              usePomodoro.setState({ lastIdleNudgeAt: Date.now() });
              toast.message('Paused — you stepped away', {
                description: 'Resume when you\'re back.',
              });
            }
            return;
          }
        }

        tick();
        const fresh = usePomodoro.getState();
        if (fresh.remainingMs <= 0 && !finalizingRef.current) {
          finalizingRef.current = true;
          handleCycleComplete().finally(() => {
            finalizingRef.current = false;
          });
        }
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCycleComplete() {
    const s = usePomodoro.getState();
    const finishedMode = s.mode;
    const scope = s.scope;
    const minutes = s.settings.workMinutes;

    if (s.settings.sound) chime();

    if (finishedMode === 'work') {
      toast.success(`✓ Focus session complete — ${minutes} min logged`, {
        description: 'Take a break.',
      });
      tryNotify('Focus session complete', 'Time for a break.');
    } else {
      toast.message('Break over — back to focus', {
        description: 'You got this.',
      });
      tryNotify('Break over', 'Ready for another focus session?');
    }

    // log time + apply state transition
    finalize({
      onWorkComplete: async (mins, scope) => {
        try {
          const res = await api<{ goal: Goal }>(`/goals/${scope.goalId}/log-time`, {
            method: 'POST',
            auth: true,
            body: { minutes: mins, ...(scope.moduleId ? { moduleId: scope.moduleId } : {}) },
          });
          upsertGoal(res.goal);
        } catch {
          // non-fatal — toast already shown
        }
      },
    });
  }

  // Browser tab title
  useEffect(() => {
    const original = document.title;
    const unsub = usePomodoro.subscribe((s) => {
      if (s.status === 'running' && s.endsAt != null) {
        document.title = `${formatTime(s.remainingMs)} — ${modeEmoji(s.mode)} ${modeLabel(s.mode)}`;
      } else if (s.status === 'paused') {
        document.title = `⏸ ${formatTime(s.remainingMs)} — Pomodoro paused`;
      } else {
        document.title = original;
      }
    });
    return () => {
      unsub();
      document.title = original;
    };
  }, []);

  return null;
}

export function ensureNotificationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Notification === 'undefined') return resolve(false);
    if (Notification.permission === 'granted') return resolve(true);
    if (Notification.permission === 'denied') return resolve(false);
    Notification.requestPermission().then((p) => resolve(p === 'granted'));
  });
}
