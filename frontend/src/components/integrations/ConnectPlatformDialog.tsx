'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plug, Sparkles } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { api, ApiError } from '@/lib/api';
import {
  PLATFORMS,
  PlatformIcon,
  platformLabel,
  platformTagline,
} from './PlatformIcon';
import type { Integration, Platform } from '@/types/integration';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected: (i: Integration) => void;
  alreadyConnected: Set<Platform>;
}

const HINTS: Record<Platform, string> = {
  leetcode:
    'Your public LeetCode username (the part after leetcode.com/u/). Recent accepted submissions only — no login required.',
  codeforces:
    'Your Codeforces handle. Last 200 submissions with full verdicts and topic tags will be pulled.',
  codechef:
    'Your CodeChef handle. Profile and recent submissions are scraped from your public profile page.',
  hackerrank:
    'Your HackerRank username. Recent solved challenges from your public profile will be pulled.',
  atcoder:
    'Your AtCoder handle. Full submission history via the Kenkoooo public mirror — verdicts included.',
  gfg:
    'Your GeeksforGeeks practice handle (the part after geeksforgeeks.org/user/). Solved problems are scraped from your public practice page.',
  hackerearth:
    'Your HackerEarth handle (the part after hackerearth.com/@). Solved problems are scraped from your public practice page.',
};

const EXAMPLES: Record<Platform, string[]> = {
  leetcode: ['lee215', 'wisdompeak', 'votrubac'],
  codeforces: ['tourist', 'jiangly', 'Errichto'],
  codechef: ['gennady.korotkevich', 'admin1234', 'tmwilliamlin'],
  hackerrank: ['solaimanope', 'abinashbordoloi', 'aalexalex'],
  atcoder: ['tourist', 'Petr', 'rng_58'],
  gfg: ['rakeshlcn', 'sandeep_jain', 'prachi_71'],
  hackerearth: ['mr.gates_99', 'ankur_garg', 'sandeep001'],
};

export function ConnectPlatformDialog({
  open,
  onClose,
  onConnected,
  alreadyConnected,
}: Props) {
  const [platform, setPlatform] = useState<Platform>(
    PLATFORMS.find((p) => !alreadyConnected.has(p)) ?? PLATFORMS[0]
  );
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setHandle('');
      const next = PLATFORMS.find((p) => !alreadyConnected.has(p));
      if (next) setPlatform(next);
    }
  }, [open, alreadyConnected]);

  const handleSubmit = async () => {
    const t = handle.trim();
    if (!t) {
      toast.error('Enter your handle');
      return;
    }
    if (alreadyConnected.has(platform)) {
      toast.error('That platform is already connected — disconnect first.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await api<{ integration: Integration }>('/integrations', {
        method: 'POST',
        auth: true,
        body: { platform, handle: t },
      });
      onConnected(r.integration);
      toast.success(
        r.integration.lastSyncStatus === 'ok'
          ? `Connected — ${r.integration.submissionCount} submissions cached`
          : `Connected, but sync had issues: ${r.integration.lastSyncError}`
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not connect');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title="Connect a platform">
      <p className="-mt-2 mb-4 text-sm text-zinc-400">
        Pull your public submissions into LearnHub. Just your handle — no login needed.
      </p>

      <div className="space-y-2">
        {PLATFORMS.map((p) => {
          const connected = alreadyConnected.has(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => !connected && setPlatform(p)}
              disabled={connected}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                platform === p && !connected
                  ? 'border-accent-violet/60 bg-accent-violet/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              )}
            >
              <PlatformIcon platform={p} size="md" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-100">{platformLabel(p)}</div>
                <div className="truncate text-xs text-zinc-500">{platformTagline(p)}</div>
              </div>
              {connected && (
                <span className="rounded-full bg-accent-emerald/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-emerald">
                  Connected
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">
          {platformLabel(platform)} handle
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !submitting && handleSubmit()}
          placeholder={`e.g. ${EXAMPLES[platform][0]}`}
          className="input-base font-mono"
          autoFocus
        />
        <p className="mt-1 text-xs text-zinc-500">{HINTS[platform]}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
          <span>Try:</span>
          {EXAMPLES[platform].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHandle(h)}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono hover:bg-white/10 hover:text-zinc-200"
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !handle.trim() || alreadyConnected.has(platform)}
          className="btn-primary"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
            </>
          ) : (
            <>
              <Plug className="h-4 w-4" /> Connect
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
