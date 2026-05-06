'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Plays an interview problem aloud using the browser's built-in
 * SpeechSynthesis API — no external service, no key required.
 *
 * The question Gemini returns can be 200-400 words; reading that verbatim is
 * tedious. We let the parent pass a concise, hand-crafted spoken script
 * (title + 1-2 sentence summary + 1 example), separate from the rich text
 * the user reads on screen, so the speaker sounds natural and quick (~30s
 * instead of 2+ minutes).
 *
 * Falls back gracefully (renders nothing) on browsers without speechSynthesis.
 */

interface Props {
  spokenScript: string;
  // Used for screen-reader fallback / display in the popover.
  excerpt?: string;
}

export function ProblemSpeaker({ spokenScript, excerpt }: Props) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cancel any in-flight speech if the script changes (new problem loaded).
  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setState('idle');
    utterRef.current = null;
  }, [spokenScript, supported]);

  if (!supported) return null;

  const play = () => {
    const synth = window.speechSynthesis;
    // If we're paused, resume.
    if (state === 'paused') {
      synth.resume();
      setState('speaking');
      return;
    }
    synth.cancel(); // stop any prior utterance
    const u = new SpeechSynthesisUtterance(spokenScript);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    // Prefer a natural-sounding English voice when available.
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => /en-US/i.test(v.lang) && /Neural|Natural|Google|Samantha/i.test(v.name)) ||
      voices.find((v) => /en-US/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang));
    if (preferred) u.voice = preferred;
    u.onend = () => setState('idle');
    u.onerror = () => setState('idle');
    utterRef.current = u;
    synth.speak(u);
    setState('speaking');
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setState('paused');
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setState('idle');
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-accent-violet/20 bg-accent-violet/5 px-3 py-2">
      <Volume2 className="h-4 w-4 shrink-0 text-accent-violet" />
      <div className="flex items-center gap-1">
        {state !== 'speaking' ? (
          <button
            onClick={play}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-violet px-2.5 py-1 text-xs font-medium text-white transition hover:bg-accent-violet/85"
            title={state === 'paused' ? 'Resume' : 'Read problem aloud'}
            type="button"
          >
            <Play className="h-3 w-3 fill-current" />
            {state === 'paused' ? 'Resume' : 'Listen'}
          </button>
        ) : (
          <button
            onClick={pause}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-violet px-2.5 py-1 text-xs font-medium text-white transition hover:bg-accent-violet/85"
            title="Pause"
            type="button"
          >
            <Pause className="h-3 w-3 fill-current" /> Pause
          </button>
        )}
        {state !== 'idle' && (
          <button
            onClick={stop}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
            title="Stop"
            type="button"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        )}
      </div>
      <span
        className={cn(
          'text-[11px]',
          state === 'speaking'
            ? 'text-accent-violet'
            : state === 'paused'
              ? 'text-amber-300'
              : 'text-zinc-500'
        )}
      >
        {state === 'speaking'
          ? 'Reading…'
          : state === 'paused'
            ? 'Paused'
            : excerpt
              ? excerpt
              : 'Tap Listen to hear it spoken'}
      </span>
    </div>
  );
}

/**
 * Build a concise spoken script from the long-form problem. We strip markdown,
 * cap to ~50 words for the body, and append the first example so the listener
 * has enough to start thinking.
 */
export function buildSpokenScript(input: {
  title: string;
  statement: string;
  examples?: Array<{ input: string; output: string }>;
}): string {
  const cleanStatement = stripMarkdown(input.statement);
  const sentences = cleanStatement.split(/(?<=[.!?])\s+/);
  // Take first 2 sentences or 50 words, whichever is shorter.
  let body = '';
  const wordCap = 50;
  let words = 0;
  for (const s of sentences) {
    const w = s.split(/\s+/).filter(Boolean).length;
    if (words + w > wordCap && body) break;
    body = body ? `${body} ${s}` : s;
    words += w;
    if (body.length > 320) break;
  }
  let script = `${input.title}. ${body}`;
  const ex = input.examples?.[0];
  if (ex) {
    script += ` For example, given input ${truncate(ex.input, 80)}, the expected output is ${truncate(ex.output, 80)}.`;
  }
  return script;
}

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, ' code block ') // fenced code
    .replace(/`[^`]+`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/[#*_>~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}
