'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, Timer } from 'lucide-react';
import { PomodoroPanel } from './PomodoroPanel';
import { usePomodoro, formatTime, modeEmoji } from '@/stores/pomodoroStore';
import type { PomodoroScope } from '@/stores/pomodoroStore';
import { cn } from '@/lib/utils';

export function PomodoroWidget(props: PomodoroScope) {
  const [open, setOpen] = useState(false);
  const { status, mode, remainingMs, scope, setScope, start, pause, resume } = usePomodoro();

  // Make sure the store knows the current page's scope so resume after navigation logs to right module
  useEffect(() => {
    if (status === 'idle') {
      setScope(props);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.goalId, props.moduleId, status]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = status !== 'idle';
  const matchesScope =
    scope?.goalId === props.goalId && (scope?.moduleId ?? '') === (props.moduleId ?? '');

  return (
    <div className="fixed bottom-6 left-6 z-30 flex flex-col items-start gap-3">
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 -z-10 bg-black/30 backdrop-blur-sm md:hidden"
            />
            <PomodoroPanel scope={props} onClose={() => setOpen(false)} />
          </>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-2xl transition',
          isActive
            ? 'bg-bg-elevated/90 text-zinc-100 backdrop-blur-xl ring-2 ring-accent-violet/50'
            : 'bg-bg-elevated/80 text-zinc-300 backdrop-blur-xl hover:text-white'
        )}
        aria-label="Open Pomodoro timer"
      >
        {isActive && matchesScope ? (
          <>
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br',
                mode === 'work' && 'from-accent-violet to-accent-fuchsia',
                mode === 'short_break' && 'from-accent-emerald to-accent-cyan',
                mode === 'long_break' && 'from-accent-cyan to-accent-violet'
              )}
            >
              <span className="text-xs">{modeEmoji(mode)}</span>
            </span>
            <span className="font-mono tabular-nums">{formatTime(remainingMs)}</span>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                if (status === 'running') pause();
                else if (status === 'paused') resume();
                else start(props);
              }}
              className="ml-1 rounded-full bg-white/10 p-1 hover:bg-white/20"
            >
              {status === 'running' ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3 fill-current" />
              )}
            </span>
          </>
        ) : isActive ? (
          // running for a different scope
          <>
            <Timer className="h-4 w-4 text-accent-violet" />
            <span className="font-mono tabular-nums">{formatTime(remainingMs)}</span>
            <span className="text-[10px] text-zinc-500">elsewhere</span>
          </>
        ) : (
          <>
            <Timer className="h-4 w-4" />
            <span className="hidden md:inline">Pomodoro</span>
          </>
        )}
      </motion.button>
    </div>
  );
}
