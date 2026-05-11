'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Code2, Layers, Lightbulb } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { CodeAnalyzerTab } from '@/components/analyzer/CodeAnalyzerTab';
import { RecommendationsTab } from '@/components/analyzer/RecommendationsTab';
import { MixedTopicsTab } from '@/components/analyzer/MixedTopicsTab';
import { cn } from '@/lib/utils';

type Tab = 'mixed' | 'code' | 'recommend';

/**
 * Analyzer is now focused on intelligent recommendations + mixed-topic analysis.
 * Historical dashboards (Overview, Smart Progress) live in the Rewind tab —
 * see the Rewind page for platform-wide stats, heatmaps, and submission timelines.
 */
export default function AnalyzerPage() {
  const [tab, setTab] = useState<Tab>('mixed');

  return (
    <AppShell>
      <header className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
              <Brain className="h-3 w-3" /> Analyzer
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">
              🧠 Intelligent practice
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Mix topics, get a personalized roadmap, analyze your code, and pick what to solve
              next. Historical dashboards live in{' '}
              <a href="/rewind" className="text-accent-violet hover:underline">
                Rewind
              </a>
              .
            </p>
          </div>
        </motion.div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-white/5 pb-2">
        <TabBtn active={tab === 'mixed'} onClick={() => setTab('mixed')} icon={Layers}>
          Mixed topics
        </TabBtn>
        <TabBtn active={tab === 'code'} onClick={() => setTab('code')} icon={Code2}>
          Code Analyzer
        </TabBtn>
        <TabBtn active={tab === 'recommend'} onClick={() => setTab('recommend')} icon={Lightbulb}>
          What to solve next
        </TabBtn>
      </div>

      {tab === 'mixed' && <MixedTopicsTab />}
      {tab === 'code' && <CodeAnalyzerTab />}
      {tab === 'recommend' && <RecommendationsTab />}
    </AppShell>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition',
        active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
