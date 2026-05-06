'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { Markdown } from '@/components/learning/Markdown';
import { MentorButton } from '@/components/learning/MentorButton';
import { PomodoroWidget } from '@/components/pomodoro/PomodoroWidget';
import { QuizPlayer } from '@/components/learning/QuizPlayer';
import { useUi } from '@/stores/uiStore';
import { useGoals } from '@/stores/goalStore';
import { useAuth } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import type { Goal, GoalModule } from '@/types/goal';
import type { Answer, LearningContent, QuizResult } from '@/types/learning';
import { cn } from '@/lib/utils';

type Tab = 'concepts' | 'examples' | 'quiz';

export default function ModuleLearningPage() {
  const router = useRouter();
  const params = useParams<{ id: string; moduleId: string }>();
  const goalId = params?.id;
  const moduleId = params?.moduleId;

  const storeGoal = useGoals((s) => (goalId ? s.getById(goalId) : undefined));
  const upsert = useGoals((s) => s.upsert);
  const updateModuleStatus = useGoals((s) => s.updateModule);

  const [goal, setGoal] = useState<Goal | null>(storeGoal ?? null);
  const [content, setContent] = useState<LearningContent | null>(null);
  const [tab, setTab] = useState<Tab>('concepts');
  const [loadingGoal, setLoadingGoal] = useState(!storeGoal);
  const [loadingContent, setLoadingContent] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);
  const [completing, setCompleting] = useState(false);
  const fetchAuthMe = useAuth((s) => s.hydrate);
  const distractionFree = useUi((s) => s.distractionFree);
  const toggleDistractionFree = useUi((s) => s.toggleDistractionFree);

  // Load goal
  useEffect(() => {
    if (!goalId) return;
    let cancelled = false;
    if (storeGoal) {
      setGoal(storeGoal);
      setLoadingGoal(false);
      return;
    }
    api<{ goal: Goal }>(`/goals/${goalId}`, { auth: true })
      .then((r) => {
        if (cancelled) return;
        setGoal(r.goal);
        upsert(r.goal);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof ApiError ? e.message : 'Failed to load goal');
        router.replace('/dashboard');
      })
      .finally(() => !cancelled && setLoadingGoal(false));
    return () => {
      cancelled = true;
    };
  }, [goalId, storeGoal, upsert, router]);

  // Load content (triggers Gemini if missing)
  useEffect(() => {
    if (!goalId || !moduleId) return;
    let cancelled = false;
    setLoadingContent(true);
    api<{ content: LearningContent }>(`/goals/${goalId}/modules/${moduleId}/content`, {
      auth: true,
    })
      .then((r) => {
        if (!cancelled) setContent(r.content);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof ApiError ? e.message : 'Could not load module content');
        }
      })
      .finally(() => !cancelled && setLoadingContent(false));
    return () => {
      cancelled = true;
    };
  }, [goalId, moduleId]);

  const mod: GoalModule | undefined = useMemo(
    () => goal?.modules.find((m) => m.moduleId === moduleId),
    [goal, moduleId]
  );

  const moduleIndex = useMemo(
    () => (goal && mod ? goal.modules.findIndex((m) => m.moduleId === mod.moduleId) : -1),
    [goal, mod]
  );

  const prevModule = goal && moduleIndex > 0 ? goal.modules[moduleIndex - 1] : null;
  const nextModule =
    goal && moduleIndex >= 0 && moduleIndex < (goal?.modules.length ?? 0) - 1
      ? goal.modules[moduleIndex + 1]
      : null;

  if (loadingGoal) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  if (!goal || !mod) {
    return (
      <AppShell>
        <div className="text-center py-20 text-zinc-400">Module not found.</div>
      </AppShell>
    );
  }

  const submitQuiz = async (answers: Record<string, Answer>): Promise<QuizResult> => {
    if (!goalId || !moduleId) throw new Error('missing route params');
    try {
      const res = await api<{ result: QuizResult }>(
        `/goals/${goalId}/modules/${moduleId}/quiz/submit`,
        { method: 'POST', body: { answers }, auth: true }
      );
      // refresh user XP
      void fetchUser();
      return res.result;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Submission failed';
      toast.error(msg);
      throw e;
    }
  };

  const fetchUser = async () => {
    try {
      const { user } = await api<{ user: any }>('/auth/me', { auth: true });
      useAuth.setState({ user });
    } catch {
      // ignore
    }
  };

  const handleRegenerate = async () => {
    if (!goalId || !moduleId) return;
    if (!confirm('Regenerate this module\'s concepts and quiz with Gemini? Your past quiz scores stay.'))
      return;
    setRegenerating(true);
    try {
      const res = await api<{ content: LearningContent }>(
        `/goals/${goalId}/modules/${moduleId}/content/regenerate`,
        { method: 'POST', auth: true }
      );
      setContent(res.content);
      toast.success('New material generated.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const markStatus = async (status: GoalModule['status']) => {
    if (!goalId || !moduleId) return;
    setCompleting(true);
    try {
      const updated = await updateModuleStatus(goalId, moduleId, status);
      setGoal(updated);
      if (status === 'completed') toast.success(`✓ "${mod.title}" complete`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        <Link href="/dashboard" className="hover:text-zinc-200">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
        <Link href={`/goals/${goal.id}`} className="hover:text-zinc-200">
          {goal.icon} {goal.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
        <span className="text-zinc-200">{mod.title}</span>
      </div>

      {/* Header */}
      <div className="glass mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 font-medium uppercase',
                  mod.difficulty === 'Easy' &&
                    'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
                  mod.difficulty === 'Medium' &&
                    'border-amber-500/30 bg-amber-500/10 text-amber-300',
                  mod.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                )}
              >
                {mod.difficulty}
              </span>
              <span className="text-zinc-500">
                Module {moduleIndex + 1} of {goal.modules.length}
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-500">{mod.estimatedHours}h estimated</span>
              {mod.quizScore !== null && (
                <span className="rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2 py-0.5 font-medium text-accent-violet">
                  Quiz: {mod.quizScore}%
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight md:text-4xl">
              {mod.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">{mod.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleDistractionFree}
              className="btn-ghost text-sm"
              title={distractionFree ? 'Exit distraction-free mode' : 'Enter distraction-free mode'}
              aria-label="Toggle distraction-free mode"
            >
              {distractionFree ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden md:inline">{distractionFree ? 'Exit focus' : 'Focus mode'}</span>
            </button>
            {mod.status === 'completed' ? (
              <button
                onClick={() => markStatus('not_started')}
                disabled={completing}
                className="btn-ghost text-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-accent-emerald" /> Completed
              </button>
            ) : (
              <button
                onClick={() => markStatus('completed')}
                disabled={completing}
                className="btn-primary text-sm"
              >
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mark complete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-white/5">
        <TabButton active={tab === 'concepts'} onClick={() => setTab('concepts')} icon={BookOpen}>
          Concepts
        </TabButton>
        <TabButton active={tab === 'examples'} onClick={() => setTab('examples')} icon={Lightbulb}>
          Examples
          {content?.examples.length ? (
            <span className="ml-1 text-xs text-zinc-500">({content.examples.length})</span>
          ) : null}
        </TabButton>
        <TabButton active={tab === 'quiz'} onClick={() => setTab('quiz')} icon={HelpCircle}>
          Quiz
          {content?.questionCount ? (
            <span className="ml-1 text-xs text-zinc-500">({content.questionCount})</span>
          ) : null}
        </TabButton>
        <div className="ml-auto pb-2">
          <button
            onClick={handleRegenerate}
            disabled={regenerating || loadingContent}
            className="btn-ghost text-xs"
            title="Regenerate this module's content with Gemini"
          >
            {regenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Regenerate
          </button>
        </div>
      </div>

      {/* Content */}
      {loadingContent ? (
        <ContentLoading />
      ) : !content ? (
        <div className="glass p-8 text-center text-zinc-400">
          Failed to load content. Try the Regenerate button above.
        </div>
      ) : tab === 'concepts' ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-accent-violet">
            <Sparkles className="h-3.5 w-3.5" /> AI-generated, cached
          </div>
          <Markdown>{content.concepts}</Markdown>
        </motion.div>
      ) : tab === 'examples' ? (
        <ExamplesTab
          content={content}
          activeIndex={exampleIdx}
          setActiveIndex={setExampleIdx}
        />
      ) : (
        <QuizPlayer
          questions={content.quiz}
          totalPoints={content.totalPoints}
          bestPercentage={content.bestPercentage}
          onSubmit={submitQuiz}
          onRetake={() => {/* state reset is internal to QuizPlayer */}}
        />
      )}

      {/* Bottom nav between modules */}
      <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-5">
        {prevModule ? (
          <Link
            href={`/goals/${goal.id}/modules/${prevModule.moduleId}`}
            className="btn-ghost text-sm"
          >
            <ChevronLeft className="h-4 w-4" /> {prevModule.title}
          </Link>
        ) : (
          <Link href={`/goals/${goal.id}`} className="btn-ghost text-sm">
            <ArrowLeft className="h-4 w-4" /> Goal overview
          </Link>
        )}
        {nextModule ? (
          <Link
            href={`/goals/${goal.id}/modules/${nextModule.moduleId}`}
            className="btn-primary text-sm"
          >
            {nextModule.title} <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link href={`/goals/${goal.id}`} className="btn-primary text-sm">
            Back to goal <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <MentorButton
        goalId={goal.id}
        goalName={goal.name}
        goalIcon={goal.icon}
        moduleId={mod.moduleId}
        moduleTitle={mod.title}
      />
      <PomodoroWidget
        goalId={goal.id}
        goalName={goal.name}
        goalIcon={goal.icon}
        moduleId={mod.moduleId}
        moduleTitle={mod.title}
      />
    </AppShell>
  );
}

function TabButton({
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
        'relative flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition',
        active ? 'text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
      {active && (
        <motion.span
          layoutId="tab-underline"
          className="absolute inset-x-2 -bottom-px h-0.5 bg-gradient-to-r from-accent-violet to-accent-fuchsia"
        />
      )}
    </button>
  );
}

function ContentLoading() {
  return (
    <div className="glass space-y-4 p-8">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent-violet" />
        <div className="text-sm text-zinc-300">
          Gemini is preparing your concepts, examples, and quiz…
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        This first load takes ~10 seconds. Subsequent visits are cached and instant.
      </p>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-full animate-pulse rounded bg-white/5" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

function ExamplesTab({
  content,
  activeIndex,
  setActiveIndex,
}: {
  content: LearningContent;
  activeIndex: number;
  setActiveIndex: (n: number) => void;
}) {
  const ex = content.examples[activeIndex];
  if (!ex) {
    return <div className="glass p-8 text-center text-zinc-400">No examples generated.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
      <nav className="space-y-1">
        {content.examples.map((e, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              'block w-full rounded-xl border px-3 py-2 text-left text-sm transition',
              i === activeIndex
                ? 'border-accent-violet/40 bg-accent-violet/10 text-white'
                : 'border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5'
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Example {i + 1}
            </div>
            <div className="mt-0.5 line-clamp-1 font-medium">{e.title}</div>
          </button>
        ))}
      </nav>
      <motion.div
        key={activeIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-accent-cyan">
          <Brain className="h-3.5 w-3.5" /> Worked example
        </div>
        <h3 className="mt-1 font-display text-xl font-semibold">{ex.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{ex.explanation}</p>
        {ex.code && (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-bg-card/80">
            <div className="border-b border-white/5 bg-white/[0.02] px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
              {ex.language || 'code'}
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-zinc-200">
              <code>{ex.code}</code>
            </pre>
          </div>
        )}
      </motion.div>
    </div>
  );
}
