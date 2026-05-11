'use client';

import { useState, useCallback } from 'react';
import { Target, Loader2, Check } from 'lucide-react';
import { useGoals } from '@/stores/goalStore';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIContent {
  title?: string;
  description?: string;
  modules?: Array<{
    title: string;
    description?: string;
    topics?: string[];
    estimatedHours?: number;
  }>;
  resources?: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
  estimatedHours?: number;
  difficulty?: string;
  category?: string;
}

interface AddToGoalsButtonProps {
  aiContent: AIContent;
  sourcePrompt?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function AddToGoalsButton({ aiContent, sourcePrompt, className, variant = 'default' }: AddToGoalsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const { fetch: refreshGoals } = useGoals();

  const handleAdd = useCallback(async () => {
    if (added || loading) return;
    setLoading(true);
    try {
      await api('/goals/from-ai-plan', {
        method: 'POST',
        auth: true,
        body: {
          name: aiContent.title ?? 'AI-Generated Learning Plan',
          description: aiContent.description ?? '',
          modules: (aiContent.modules ?? []).map((m, i) => ({
            title: m.title,
            description: m.description ?? '',
            topics: m.topics ?? [],
            estimatedHours: m.estimatedHours ?? 1,
            difficulty: 'Medium',
          })),
          resources: (aiContent.resources ?? []).map(r => ({
            title: r.title,
            url: r.url,
            type: r.type ?? 'docs',
          })),
          estimatedHours: aiContent.estimatedHours ?? 10,
          difficulty: aiContent.difficulty ?? 'Intermediate',
          category: aiContent.category ?? 'other',
          sourcePrompt: sourcePrompt ?? '',
        },
      });
      setAdded(true);
      toast.success('Added to your goals! Check your dashboard.');
      refreshGoals({ force: true });
    } catch (err) {
      toast.error('Failed to add to goals');
    } finally {
      setLoading(false);
    }
  }, [aiContent, sourcePrompt, added, loading, refreshGoals]);

  if (variant === 'compact') {
    return (
      <button
        onClick={handleAdd}
        disabled={loading || added}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
          added
            ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
            : 'border-accent-fuchsia/30 bg-accent-fuchsia/10 text-accent-fuchsia hover:bg-accent-fuchsia/20',
          className
        )}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : added ? (
          <Check className="h-3 w-3" />
        ) : (
          <Target className="h-3 w-3" />
        )}
        {added ? 'Added' : 'Add to Goals'}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading || added}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition',
        added
          ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
          : 'border-accent-fuchsia/30 bg-gradient-to-r from-accent-fuchsia/20 to-accent-violet/20 text-accent-fuchsia hover:from-accent-fuchsia/30 hover:to-accent-violet/30',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding...
        </>
      ) : added ? (
        <>
          <Check className="h-4 w-4" />
          Added to Goals
        </>
      ) : (
        <>
          <Target className="h-4 w-4" />
          Add to Goals
        </>
      )}
    </button>
  );
}
