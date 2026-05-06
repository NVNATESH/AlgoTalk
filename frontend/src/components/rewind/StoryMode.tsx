'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import type { RewindData, RewindInsights } from '@/types/rewind';
import { cn } from '@/lib/utils';

const SLIDE_DURATION_MS = 5000;

type Slide = {
  id: string;
  bg: string; // gradient classes
  emoji: string;
  kicker?: string;
  big: string | number;
  bigLabel: string;
  detail?: string;
  caption?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  data: RewindData;
  userName: string;
  insights?: RewindInsights | null;
}

export function StoryMode({ open, onClose, data, userName, insights }: Props) {
  const slides = useMemo(() => buildSlides(data, userName, insights), [data, userName, insights]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setIdx(0);
      setPaused(false);
    }
  }, [open]);

  // Auto-advance
  useEffect(() => {
    if (!open || paused) return;
    if (idx >= slides.length - 1) return;
    const id = setTimeout(() => setIdx((i) => Math.min(slides.length - 1, i + 1)), SLIDE_DURATION_MS);
    return () => clearTimeout(id);
  }, [open, paused, idx, slides.length]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === ' ') setIdx((i) => Math.min(slides.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (e.key === 'p' || e.key === 'P') setPaused((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, slides.length, onClose]);

  if (!open) return null;
  const slide = slides[idx];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col bg-bg/95 backdrop-blur-2xl"
    >
      {/* Top bar with progress + close */}
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="flex flex-1 gap-1">
          {slides.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                key={`${i}-${idx === i ? 'active' : 'inactive'}-${paused ? 'paused' : 'live'}`}
                className="h-full bg-gradient-to-r from-accent-violet to-accent-fuchsia"
                initial={{ width: i < idx ? '100%' : '0%' }}
                animate={{ width: i < idx ? '100%' : i === idx ? '100%' : '0%' }}
                transition={
                  i === idx
                    ? { duration: paused ? 0 : SLIDE_DURATION_MS / 1000, ease: 'linear' }
                    : { duration: 0 }
                }
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => setPaused((v) => !v)}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          aria-label={paused ? 'Resume' : 'Pause'}
          title="Pause / play (P)"
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          aria-label="Exit story"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Slide */}
      <div className="relative flex flex-1 items-center justify-center px-6">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="absolute left-4 z-10 rounded-full border border-white/10 bg-bg-elevated/70 p-2 text-zinc-400 backdrop-blur transition hover:text-zinc-100 disabled:opacity-30"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -10 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br p-10 text-center shadow-2xl md:p-16',
              slide.bg
            )}
          >
            {/* Decorative blobs */}
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-black/30 blur-3xl" />

            <div className="relative">
              {slide.kicker && (
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                  {slide.kicker}
                </div>
              )}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
                className="mt-4 text-7xl"
              >
                {slide.emoji}
              </motion.div>
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5, type: 'spring', stiffness: 200 }}
                className="mt-6 font-display text-7xl font-bold tracking-tight md:text-8xl"
              >
                {slide.big}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-2 font-display text-2xl font-semibold text-white/90"
              >
                {slide.bigLabel}
              </motion.div>
              {slide.detail && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-6 text-base text-white/80 md:text-lg"
                >
                  {slide.detail}
                </motion.div>
              )}
              {slide.caption && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mt-4 text-sm italic text-white/60"
                >
                  {slide.caption}
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => {
            if (idx >= slides.length - 1) {
              onClose();
            } else {
              setIdx((i) => Math.min(slides.length - 1, i + 1));
            }
          }}
          className="absolute right-4 z-10 rounded-full border border-white/10 bg-bg-elevated/70 p-2 text-zinc-400 backdrop-blur transition hover:text-zinc-100"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 py-3 text-center text-[11px] text-zinc-500">
        {idx + 1} / {slides.length} · ← → to navigate · P to pause · Esc to close
      </div>
    </motion.div>
  );
}

const LANG_DISPLAY: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
};

function buildSlides(data: RewindData, userName: string, insights?: RewindInsights | null): Slide[] {
  const slides: Slide[] = [];

  slides.push({
    id: 'welcome',
    bg: 'from-accent-violet via-accent-fuchsia to-accent-rose',
    emoji: '✨',
    kicker: `${data.year} REWIND`,
    big: userName.split(' ')[0] || 'You',
    bigLabel: 'your year, in numbers',
    detail: `${data.totals.distinctSolved} problems solved across ${data.totals.activeDays} active days. Let\'s dive in.`,
  });

  slides.push({
    id: 'submissions',
    bg: 'from-accent-violet to-accent-cyan',
    emoji: '⚡',
    kicker: 'You wrote a lot of code',
    big: data.totals.submissions.toLocaleString(),
    bigLabel: 'submissions sent to the judge',
    detail: `That\'s ${data.totals.avgAcceptanceRate}% acceptance — every wrong answer was a lesson.`,
  });

  if (data.bestMonth) {
    slides.push({
      id: 'best-month',
      bg: 'from-accent-fuchsia via-amber-500 to-accent-emerald',
      emoji: '🚀',
      kicker: 'Your peak month',
      big: data.bestMonth.monthLabel,
      bigLabel: `${data.bestMonth.solved} problem${data.bestMonth.solved === 1 ? '' : 's'} solved`,
      detail: 'You were on fire that month.',
    });
  }

  if (data.totals.longestStreak >= 2) {
    slides.push({
      id: 'streak',
      bg: 'from-amber-500 via-accent-rose to-accent-fuchsia',
      emoji: '🔥',
      kicker: 'Longest streak',
      big: data.totals.longestStreak,
      bigLabel: `consecutive day${data.totals.longestStreak === 1 ? '' : 's'}`,
      detail: 'Showing up — that\'s the hardest part of getting good.',
    });
  }

  if (data.topLanguage) {
    slides.push({
      id: 'language',
      bg: 'from-accent-emerald to-accent-cyan',
      emoji: '🧠',
      kicker: 'Your language of choice',
      big: LANG_DISPLAY[data.topLanguage.language] ?? data.topLanguage.language,
      bigLabel: `${data.topLanguage.pct}% of submissions`,
      detail: `${data.topLanguage.count} submission${data.topLanguage.count === 1 ? '' : 's'} this year.`,
    });
  }

  if (data.topTopics[0]) {
    const topics = data.topTopics.slice(0, 3);
    slides.push({
      id: 'topic',
      bg: 'from-accent-cyan via-accent-violet to-accent-fuchsia',
      emoji: '🎯',
      kicker: 'Your top topic',
      big: topics[0].topic,
      bigLabel: `${topics[0].solvedCount} problem${topics[0].solvedCount === 1 ? '' : 's'} solved`,
      detail:
        topics.length > 1
          ? `Followed by ${topics
              .slice(1)
              .map((t) => `${t.topic} (${t.solvedCount})`)
              .join(', ')}.`
          : undefined,
    });
  }

  if (data.totals.byDifficulty.Hard > 0) {
    slides.push({
      id: 'hard',
      bg: 'from-accent-rose via-accent-fuchsia to-accent-violet',
      emoji: '💎',
      kicker: 'Hard problems conquered',
      big: data.totals.byDifficulty.Hard,
      bigLabel: data.totals.byDifficulty.Hard === 1 ? 'Hard problem solved' : 'Hard problems solved',
      detail: `Out of ${data.totals.distinctSolved} total solves — ${
        Math.round((data.totals.byDifficulty.Hard / Math.max(1, data.totals.distinctSolved)) * 100)
      }% of your wins.`,
    });
  }

  // H1 vs H2
  const halfDelta = data.h2.distinctSolved - data.h1.distinctSolved;
  if (data.h1.submissions > 0 || data.h2.submissions > 0) {
    slides.push({
      id: 'halves',
      bg: 'from-accent-violet to-accent-emerald',
      emoji: '⚖️',
      kicker: 'H1 vs H2',
      big: halfDelta === 0 ? 'Steady' : halfDelta > 0 ? 'Stronger H2' : 'Stronger H1',
      bigLabel:
        halfDelta === 0
          ? 'pretty even split'
          : halfDelta > 0
            ? `${data.h2.distinctSolved} vs ${data.h1.distinctSolved} solved`
            : `${data.h1.distinctSolved} vs ${data.h2.distinctSolved} solved`,
      detail: insights?.h1VsH2,
    });
  }

  if (data.goalsCompletedThisYear > 0) {
    slides.push({
      id: 'goals',
      bg: 'from-accent-emerald to-accent-violet',
      emoji: '🎓',
      kicker: 'Goals completed',
      big: data.goalsCompletedThisYear,
      bigLabel: data.goalsCompletedThisYear === 1 ? 'roadmap finished' : 'roadmaps finished',
      detail: 'Real progress, measured in modules shipped.',
    });
  }

  if (insights?.narrative) {
    slides.push({
      id: 'narrative',
      bg: 'from-accent-cyan via-accent-violet to-accent-fuchsia',
      emoji: '📖',
      kicker: 'AI year-in-review',
      big: '',
      bigLabel: '',
      detail: insights.narrative,
    });
  }

  slides.push({
    id: 'closing',
    bg: 'from-accent-violet via-accent-fuchsia to-amber-500',
    emoji: '🎉',
    kicker: 'See you in ' + (data.year + 1),
    big: 'Thank you',
    bigLabel: 'for an incredible year',
    detail: 'Keep solving. Keep showing up.',
  });

  return slides;
}
