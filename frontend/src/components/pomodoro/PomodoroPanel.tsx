'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Settings,
  SkipForward,
  Target,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CircularTimer } from './CircularTimer';
import { ensureNotificationPermission } from './PomodoroProvider';
import {
  usePomodoro,
  modeEmoji,
  modeLabel,
  type PomodoroMode,
  type PomodoroScope,
} from '@/stores/pomodoroStore';
import { cn } from '@/lib/utils';

interface PomodoroPanelProps {
  scope: PomodoroScope;
  onClose: () => void;
}

export function PomodoroPanel({ scope, onClose }: PomodoroPanelProps) {
  const {
    status,
    mode,
    remainingMs,
    totalSeconds,
    settings,
    completedWorkCycles,
    workSessionsToday,
    start,
    pause,
    resume,
    reset,
    skip,
    setMode,
    updateSettings,
  } = usePomodoro();
  const [showSettings, setShowSettings] = useState(false);

  const handleStart = async () => {
    if (settings.notifications) await ensureNotificationPermission();
    if (status === 'idle') start(scope);
    else if (status === 'paused') resume();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 280, damping: 25 }}
      className="glass-strong w-[340px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <Target className="h-3 w-3" /> Focus
          </div>
          <div className="truncate text-sm font-medium text-zinc-100">
            {scope.goalIcon} {scope.moduleTitle ?? scope.goalName}
          </div>
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          aria-label={showSettings ? 'Close settings' : 'Open settings'}
        >
          {showSettings ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
        </button>
      </div>

      {showSettings ? (
        <SettingsView />
      ) : (
        <>
          {/* Mode tabs */}
          <div className="flex border-b border-white/5 px-2 py-2">
            {(['work', 'short_break', 'long_break'] as PomodoroMode[]).map((m) => (
              <button
                key={m}
                onClick={() => status === 'idle' && setMode(m)}
                disabled={status !== 'idle'}
                className={cn(
                  'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition disabled:opacity-50',
                  mode === m
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                )}
              >
                {modeEmoji(m)} {modeLabel(m)}
              </button>
            ))}
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center gap-4 px-4 pb-2 pt-5">
            <CircularTimer
              remainingMs={remainingMs}
              totalSeconds={totalSeconds}
              mode={mode}
              status={status}
              size={210}
              stroke={12}
              label={modeLabel(mode)}
            />

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                disabled={status === 'idle'}
                className="rounded-full border border-white/10 bg-white/5 p-2.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200 disabled:opacity-40"
                title="Reset"
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {status === 'running' ? (
                <button
                  onClick={pause}
                  className="rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia px-7 py-3 font-semibold text-white shadow-lg shadow-accent-violet/30"
                >
                  <Pause className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className="rounded-full bg-gradient-to-r from-accent-violet to-accent-fuchsia px-7 py-3 font-semibold text-white shadow-lg shadow-accent-violet/30"
                >
                  <Play className="h-5 w-5 fill-current" />
                </button>
              )}

              <button
                onClick={skip}
                disabled={status === 'idle'}
                className="rounded-full border border-white/10 bg-white/5 p-2.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200 disabled:opacity-40"
                title="Skip"
                aria-label="Skip"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid w-full grid-cols-3 gap-2 pt-3">
              <Stat label="Today" value={workSessionsToday.toString()} icon="🍅" />
              <Stat
                label="Cycle"
                value={`${(completedWorkCycles % settings.cyclesUntilLongBreak) + (mode === 'work' ? 0 : 1)}/${settings.cyclesUntilLongBreak}`}
              />
              <Stat label="Total" value={completedWorkCycles.toString()} />
            </div>

            {mode !== 'work' && (
              <p className="flex items-center gap-1.5 pt-1 text-xs text-zinc-500">
                <Coffee className="h-3 w-3" /> Take a real break — water, stretch, look away.
              </p>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] py-2 text-center">
      <div className="font-display text-base font-semibold tabular-nums">
        {icon ? `${icon} ` : ''}
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function SettingsView() {
  const settings = usePomodoro((s) => s.settings);
  const updateSettings = usePomodoro((s) => s.updateSettings);

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Durations</div>
      <NumberInput
        label="Focus (minutes)"
        value={settings.workMinutes}
        min={5}
        max={90}
        onChange={(v) => updateSettings({ workMinutes: v })}
      />
      <NumberInput
        label="Short break"
        value={settings.shortBreakMinutes}
        min={1}
        max={30}
        onChange={(v) => updateSettings({ shortBreakMinutes: v })}
      />
      <NumberInput
        label="Long break"
        value={settings.longBreakMinutes}
        min={5}
        max={60}
        onChange={(v) => updateSettings({ longBreakMinutes: v })}
      />
      <NumberInput
        label="Cycles until long break"
        value={settings.cyclesUntilLongBreak}
        min={2}
        max={8}
        onChange={(v) => updateSettings({ cyclesUntilLongBreak: v })}
      />

      <div className="border-t border-white/5 pt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Behavior
      </div>
      <Toggle
        label="Auto-start breaks"
        value={settings.autoStartBreaks}
        onChange={(v) => updateSettings({ autoStartBreaks: v })}
      />
      <Toggle
        label="Auto-start focus after break"
        value={settings.autoStartWork}
        onChange={(v) => updateSettings({ autoStartWork: v })}
      />
      <Toggle
        label={
          <>
            <span>Sound</span>
            {settings.sound ? (
              <Volume2 className="h-3.5 w-3.5 text-accent-violet" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </>
        }
        value={settings.sound}
        onChange={(v) => updateSettings({ sound: v })}
      />
      <Toggle
        label={
          <>
            <span>Browser notifications</span>
            {settings.notifications ? (
              <Bell className="h-3.5 w-3.5 text-accent-violet" />
            ) : (
              <BellOff className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </>
        }
        value={settings.notifications}
        onChange={async (v) => {
          if (v) await ensureNotificationPermission();
          updateSettings({ notifications: v });
        }}
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Math.max(min, Math.min(max, Number(e.target.value) || min));
          onChange(v);
        }}
        className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/40"
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: React.ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-zinc-300">
      <span className="flex items-center gap-2">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative h-5 w-9 rounded-full transition',
          value ? 'bg-accent-violet' : 'bg-white/10'
        )}
        role="switch"
        aria-checked={value}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
            value ? 'left-[18px]' : 'left-0.5'
          )}
        />
      </button>
    </label>
  );
}
