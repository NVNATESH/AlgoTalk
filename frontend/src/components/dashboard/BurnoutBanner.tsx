'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface BurnoutStatus {
  burnout: boolean;
  consecutiveHighDays: number;
  totalMinutesLast7: number;
  averageDailyMinutesLast7: number;
  threshold: { dailyMinutes: number; days: number };
}

export function BurnoutBanner() {
  const [status, setStatus] = useState<BurnoutStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api<BurnoutStatus>('/goals/burnout-status', { auth: true })
      .then(setStatus)
      .catch(() => undefined);
  }, []);

  if (!status || !status.burnout || dismissed) return null;

  const avgHours = (status.averageDailyMinutesLast7 / 60).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-amber-200">
          You've been on the grind for {status.consecutiveHighDays} days straight
        </div>
        <p className="mt-0.5 text-[12px] text-amber-100/80">
          {avgHours}h/day on average over the last 7 days. Sustained focus over{' '}
          {status.threshold.dailyMinutes / 60}h/day for{' '}
          {status.threshold.days}+ days is a known burnout signal — consider a lighter day,
          a walk, or moving to a different topic. Your brain consolidates better with rest.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-[11px] text-amber-200/60 hover:text-amber-100"
      >
        Dismiss
      </button>
    </motion.div>
  );
}
