'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { editor as MonacoTypes } from 'monaco-editor';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { Markdown } from '@/components/learning/Markdown';
import { CodeEditor } from '@/components/problem/CodeEditor';
import { AiPanel } from '@/components/problem/AiPanel';
import { CodeReviewPanel } from '@/components/problem/CodeReviewPanel';
import { useReviewDecorations, type ReviewLineComment } from '@/hooks/useReviewDecorations';
import { api, ApiError } from '@/lib/api';
import type {
  Language,
  ProblemDetail,
  RunResult,
  RunResultPerCase,
  Submission,
} from '@/types/problem';
import { cn } from '@/lib/utils';

type LeftTab = 'description' | 'submissions';
type BottomTab = 'testcase' | 'result';

const LANG_LABEL: Record<Language, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
};

const LANG_KEY = 'learnhub.preferredLanguage';

export default function SolvePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState('');
  const [leftTab, setLeftTab] = useState<LeftTab>('description');
  const [bottomTab, setBottomTab] = useState<BottomTab>('testcase');
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [aiOpen, setAiOpen] = useState(false);

  // Active testcase index for the testcase tab
  const [activeTestIdx, setActiveTestIdx] = useState(0);
  const [customMode, setCustomMode] = useState(false);
  const [customStdin, setCustomStdin] = useState('');

  const [editor, setEditor] = useState<MonacoTypes.IStandaloneCodeEditor | null>(null);
  const editorRef = useRef<MonacoTypes.IStandaloneCodeEditor | null>(null);
  const jumpToLine = (line: number) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.revealLineInCenter(line);
    ed.setPosition({ lineNumber: line, column: 1 });
    ed.focus();
  };

  const [reviewComments, setReviewComments] = useState<ReviewLineComment[]>([]);
  useReviewDecorations(editor, reviewComments);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && ['python', 'javascript', 'java', 'cpp'].includes(saved)) {
        setLanguage(saved as Language);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(LANG_KEY, language);
  }, [language]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    api<{ problem: ProblemDetail }>(`/problems/${slug}`, { auth: true })
      .then((r) => {
        if (cancelled) return;
        setProblem(r.problem);
        // restore code from per-(slug, language) localStorage if available, else starter
        const stored = readStoredCode(slug, language);
        setCode(stored ?? r.problem.starterCode[language] ?? '');
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : 'Failed to load problem';
        setError(msg);
        if (e instanceof ApiError && e.status === 404) {
          toast.error('Problem not found');
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // When language changes, swap to that language's starter (or stored code for that lang)
  useEffect(() => {
    if (!problem) return;
    const stored = readStoredCode(problem.slug, language);
    setCode(stored ?? problem.starterCode[language] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, problem?.slug]);

  // Persist code per (slug, language)
  useEffect(() => {
    if (!problem) return;
    writeStoredCode(problem.slug, language, code);
  }, [code, language, problem]);

  const handleRun = async () => {
    if (!problem) return;
    setRunning(true);
    setBottomTab('result');
    setBottomCollapsed(false);
    try {
      const body: Record<string, unknown> = { language, code };
      if (customMode && customStdin.trim()) body.customStdin = customStdin;
      const r = await api<{ result: RunResult }>(`/problems/${problem.slug}/run`, {
        method: 'POST',
        auth: true,
        body,
      });
      setRunResult(r.result);
      setSubmission(null);
      if (r.result.mode === 'tests') {
        if (r.result.passed === r.result.total)
          toast.success(`✓ Passed ${r.result.passed}/${r.result.total} visible tests`);
        else toast.error(`✗ ${r.result.passed}/${r.result.total} visible tests passed`);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem) return;
    setSubmitting(true);
    setBottomTab('result');
    setBottomCollapsed(false);
    try {
      const r = await api<{ submission: Submission; creditsRemaining?: number }>(
        `/problems/${problem.slug}/submit`,
        { method: 'POST', auth: true, body: { language, code } }
      );
      setSubmission(r.submission);
      setRunResult(null);
      if (r.submission.status === 'accepted') {
        toast.success(
          `🎉 Accepted — ${r.submission.passedCount}/${r.submission.totalCount} test cases passed`
        );
      } else {
        toast.error(
          `${formatStatus(r.submission.status)} — ${r.submission.passedCount}/${r.submission.totalCount} passed`
        );
      }
      // Refresh submissions list if it's open
      if (leftTab === 'submissions') void loadSubmissions();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const loadSubmissions = async () => {
    if (!problem) return;
    try {
      const r = await api<{ submissions: Submission[] }>(
        `/problems/${problem.slug}/submissions`,
        { auth: true }
      );
      setSubmissions(r.submissions);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (leftTab === 'submissions') void loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftTab, problem?.slug]);

  const resetCode = () => {
    if (!problem) return;
    if (!confirm('Reset to starter code? Your current draft for this language will be lost.')) return;
    setCode(problem.starterCode[language] ?? '');
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  if (error || !problem) {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-8 text-center">
          <h2 className="font-display text-xl font-semibold">Problem unavailable</h2>
          <p className="mt-2 text-sm text-zinc-400">{error ?? 'Try going back to the list.'}</p>
          <Link href="/problems" className="btn-primary mt-5 inline-flex">
            <ArrowLeft className="h-4 w-4" /> Back to problems
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href="/problems" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Problems
        </Link>
        <button
          onClick={() => setAiOpen((v) => !v)}
          className={cn('btn-ghost text-xs', aiOpen && 'border-accent-violet/40 bg-accent-violet/10 text-accent-violet')}
        >
          <Sparkles className="h-3.5 w-3.5" /> AI Helper
        </button>
      </div>

      <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-3 lg:grid-cols-2">
        {/* LEFT: Description / Submissions */}
        <section className="glass flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center gap-1 border-b border-white/5 px-2 py-2">
            <TabBtn active={leftTab === 'description'} onClick={() => setLeftTab('description')}>
              Description
            </TabBtn>
            <TabBtn active={leftTab === 'submissions'} onClick={() => setLeftTab('submissions')}>
              Submissions
              {submissions.length > 0 && <span className="ml-1 text-xs text-zinc-500">({submissions.length})</span>}
            </TabBtn>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {leftTab === 'description' ? (
              <DescriptionTab problem={problem} />
            ) : (
              <SubmissionsTab submissions={submissions} />
            )}
          </div>
        </section>

        {/* RIGHT: Editor + bottom tests/results */}
        <section className="flex min-h-0 flex-col gap-3">
          {/* Editor card */}
          <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-violet/40"
                >
                  {Object.entries(LANG_LABEL).map(([k, v]) => (
                    <option key={k} value={k} className="bg-bg-card">
                      {v}
                    </option>
                  ))}
                </select>
                <button onClick={resetCode} className="text-xs text-zinc-500 hover:text-zinc-200">
                  Reset
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRun}
                  disabled={running || submitting}
                  className="btn-ghost text-xs"
                >
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={running || submitting}
                  className="btn-primary text-xs"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Submit
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <CodeEditor
                language={language}
                value={code}
                onChange={setCode}
                onMount={(ed) => {
                  editorRef.current = ed;
                  setEditor(ed);
                }}
              />
            </div>
          </div>

          {/* Bottom panel: testcases / results */}
          <div className={cn('glass flex flex-col overflow-hidden transition-all', bottomCollapsed ? 'h-12' : 'h-[260px]')}>
            <div className="flex items-center gap-1 border-b border-white/5 px-2 py-2">
              <TabBtn active={bottomTab === 'testcase'} onClick={() => { setBottomTab('testcase'); setBottomCollapsed(false); }}>
                Testcase
              </TabBtn>
              <TabBtn active={bottomTab === 'result'} onClick={() => { setBottomTab('result'); setBottomCollapsed(false); }}>
                Result
              </TabBtn>
              <button
                onClick={() => setBottomCollapsed((v) => !v)}
                className="ml-auto rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                aria-label="Toggle"
              >
                {bottomCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {!bottomCollapsed && (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {bottomTab === 'testcase' ? (
                  <TestcasePanel
                    visibleTests={problem.visibleTestCases}
                    activeIdx={activeTestIdx}
                    setActiveIdx={setActiveTestIdx}
                    customMode={customMode}
                    setCustomMode={setCustomMode}
                    customStdin={customStdin}
                    setCustomStdin={setCustomStdin}
                  />
                ) : (
                  <ResultPanel
                    runResult={runResult}
                    submission={submission}
                    slug={problem.slug}
                    onJumpToLine={jumpToLine}
                    onReviewCommentsChange={setReviewComments}
                  />
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {aiOpen && (
        <motion.aside
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          className="fixed inset-y-0 right-0 z-40 w-full border-l border-white/10 bg-bg/95 backdrop-blur-2xl shadow-2xl md:w-[420px]"
        >
          <AiPanel
            slug={problem.slug}
            language={language}
            code={code}
            onApplyOptimized={(c) => {
              setCode(c);
              toast.success('Applied optimized code');
            }}
            onClose={() => setAiOpen(false)}
          />
        </motion.aside>
      )}
    </AppShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-medium transition',
        active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
      )}
    >
      {children}
    </button>
  );
}

function DescriptionTab({ problem }: { problem: ProblemDetail }) {
  return (
    <article>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-bold leading-tight">{problem.title}</h1>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase',
            problem.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
            problem.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            problem.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
          )}
        >
          {problem.difficulty}
        </span>
        {problem.userStatus === 'solved' && (
          <span className="flex items-center gap-1 rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">
            <CheckCircle2 className="h-3 w-3" /> Solved
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {problem.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-5 text-sm">
        <Markdown>{problem.description}</Markdown>
      </div>

      {problem.examples.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Examples
          </h3>
          <div className="space-y-3">
            {problem.examples.map((ex, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
                <div className="text-xs font-semibold text-zinc-400">Example {i + 1}</div>
                <div className="mt-1.5 grid gap-1.5">
                  <KvLine k="Input" v={ex.input} />
                  <KvLine k="Output" v={ex.output} />
                  {ex.explanation && (
                    <div className="text-xs text-zinc-400">
                      <span className="font-medium text-zinc-300">Note: </span>
                      {ex.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(problem.inputFormat || problem.outputFormat) && (
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {problem.inputFormat && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Input format
              </div>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-zinc-300">{problem.inputFormat}</pre>
            </div>
          )}
          {problem.outputFormat && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Output format
              </div>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-zinc-300">{problem.outputFormat}</pre>
            </div>
          )}
        </section>
      )}

      {problem.constraints && (
        <section className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Constraints
          </div>
          <div className="mt-1.5 text-sm">
            <Markdown>{problem.constraints}</Markdown>
          </div>
        </section>
      )}
    </article>
  );
}

function KvLine({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="text-xs font-semibold text-zinc-400">{k}: </span>
      <pre className="mt-0.5 inline-block whitespace-pre-wrap rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-zinc-100">
        {v}
      </pre>
    </div>
  );
}

function TestcasePanel({
  visibleTests,
  activeIdx,
  setActiveIdx,
  customMode,
  setCustomMode,
  customStdin,
  setCustomStdin,
}: {
  visibleTests: { stdin: string; expectedStdout: string }[];
  activeIdx: number;
  setActiveIdx: (n: number) => void;
  customMode: boolean;
  setCustomMode: (v: boolean) => void;
  customStdin: string;
  setCustomStdin: (v: string) => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {visibleTests.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCustomMode(false);
              setActiveIdx(i);
            }}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs',
              !customMode && i === activeIdx
                ? 'border-accent-violet/60 bg-accent-violet/15 text-white'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
            )}
          >
            Case {i + 1}
          </button>
        ))}
        <button
          onClick={() => setCustomMode(true)}
          className={cn(
            'rounded-lg border px-2.5 py-1 text-xs',
            customMode
              ? 'border-accent-fuchsia/60 bg-accent-fuchsia/10 text-white'
              : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
          )}
        >
          Custom
        </button>
      </div>

      {customMode ? (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Custom stdin</div>
          <textarea
            value={customStdin}
            onChange={(e) => setCustomStdin(e.target.value)}
            placeholder="Type input that will be piped to your program's stdin..."
            rows={5}
            className="input-base mt-1 resize-y font-mono text-xs"
          />
          <p className="mt-1.5 text-[10px] text-zinc-500">
            "Run" will use this input. Output is shown raw — there's no expected to compare against in custom mode.
          </p>
        </div>
      ) : (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">stdin</div>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-white/5 bg-white/[0.02] p-2 font-mono text-xs text-zinc-100">
            {visibleTests[activeIdx]?.stdin}
          </pre>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">expected stdout</div>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-white/5 bg-white/[0.02] p-2 font-mono text-xs text-zinc-100">
            {visibleTests[activeIdx]?.expectedStdout}
          </pre>
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  runResult,
  submission,
  slug,
  onJumpToLine,
  onReviewCommentsChange,
}: {
  runResult: RunResult | null;
  submission: Submission | null;
  slug: string;
  onJumpToLine: (line: number) => void;
  onReviewCommentsChange: (comments: ReviewLineComment[]) => void;
}) {
  if (!runResult && !submission) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Run or submit your code to see results.
      </div>
    );
  }

  if (submission) {
    const ok = submission.status === 'accepted';
    return (
      <div className="space-y-3">
        <div
          className={cn(
            'rounded-xl border p-3',
            ok
              ? 'border-accent-emerald/30 bg-accent-emerald/5'
              : 'border-accent-rose/30 bg-accent-rose/5'
          )}
        >
          <div className="flex items-center gap-2">
            {ok ? (
              <CheckCircle2 className="h-5 w-5 text-accent-emerald" />
            ) : (
              <XCircle className="h-5 w-5 text-accent-rose" />
            )}
            <span className="font-display text-base font-semibold">{formatStatus(submission.status)}</span>
            <span className="ml-auto font-mono text-xs text-zinc-400">
              {submission.passedCount}/{submission.totalCount} passed
            </span>
          </div>
          {ok && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <Stat label="Runtime" value={`${submission.runtimeMs}ms`} />
              <Stat label="Memory" value={`${(submission.memoryKb / 1024).toFixed(1)}MB`} />
            </div>
          )}
        </div>

        {!ok && submission.failedTestSnippet && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              First failure
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/5 bg-white/[0.02] p-2 font-mono text-xs text-zinc-300">
              {submission.failedTestSnippet}
            </pre>
          </div>
        )}

        {!ok && submission.stderrSnippet && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              stderr
            </div>
            <pre className="overflow-x-auto rounded-lg border border-accent-rose/20 bg-accent-rose/5 p-2 font-mono text-xs text-accent-rose">
              {submission.stderrSnippet}
            </pre>
          </div>
        )}

        <CodeReviewPanel
          slug={slug}
          submissionId={submission.id}
          onJumpToLine={onJumpToLine}
          onCommentsChange={onReviewCommentsChange}
        />
      </div>
    );
  }

  // runResult
  if (runResult!.mode === 'custom') {
    const r = runResult!;
    return (
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">stdout</div>
        <pre className="overflow-x-auto rounded-lg border border-white/5 bg-white/[0.02] p-2 font-mono text-xs text-zinc-100">
          {r.stdout || '(empty)'}
        </pre>
        {r.stderr && (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">stderr</div>
            <pre className="overflow-x-auto rounded-lg border border-accent-rose/20 bg-accent-rose/5 p-2 font-mono text-xs text-accent-rose">
              {r.stderr}
            </pre>
          </>
        )}
        <div className="text-[10px] text-zinc-500">
          {r.executionTimeMs}ms · {(r.memoryKb / 1024).toFixed(1)}MB
        </div>
      </div>
    );
  }

  const tests = runResult!;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {tests.passed === tests.total ? (
          <CheckCircle2 className="h-4 w-4 text-accent-emerald" />
        ) : (
          <XCircle className="h-4 w-4 text-accent-rose" />
        )}
        <span className="font-display font-semibold">
          {tests.passed}/{tests.total} visible tests passed
        </span>
        {tests.creditsRemaining !== undefined && (
          <span className="ml-auto font-mono text-[10px] text-zinc-500">
            {tests.creditsRemaining} credits left
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {tests.results.map((r, i) => (
          <TestcaseResultRow key={i} idx={i} r={r} />
        ))}
      </div>
    </div>
  );
}

function TestcaseResultRow({ idx, r }: { idx: number; r: RunResultPerCase }) {
  const [open, setOpen] = useState(!r.passed);
  return (
    <div className={cn(
      'rounded-lg border p-2',
      r.passed ? 'border-accent-emerald/20 bg-accent-emerald/[0.04]' : 'border-accent-rose/30 bg-accent-rose/5'
    )}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-xs"
      >
        <span className="flex items-center gap-2">
          {r.passed ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-accent-emerald" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-accent-rose" />
          )}
          Case {idx + 1}
        </span>
        <span className="font-mono text-[10px] text-zinc-500">{r.executionTimeMs}ms</span>
        {open ? <ChevronUp className="h-3 w-3 text-zinc-500" /> : <ChevronDown className="h-3 w-3 text-zinc-500" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1 font-mono text-[11px]">
          <KvLine k="stdin" v={r.stdin} />
          <KvLine k="expected" v={r.expected} />
          <KvLine k="actual" v={r.actual || '(empty)'} />
          {r.stderr && <KvLine k="stderr" v={r.stderr} />}
        </div>
      )}
    </div>
  );
}

function SubmissionsTab({ submissions }: { submissions: Submission[] }) {
  if (submissions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        No submissions yet. Hit Submit to run against all test cases.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {submissions.map((s) => (
        <div
          key={s.id}
          className={cn(
            'flex items-center justify-between rounded-xl border p-3 text-sm',
            s.status === 'accepted'
              ? 'border-accent-emerald/30 bg-accent-emerald/5'
              : 'border-white/10 bg-white/[0.02]'
          )}
        >
          <div>
            <div className="flex items-center gap-2 font-medium">
              {s.status === 'accepted' ? (
                <CheckCircle2 className="h-4 w-4 text-accent-emerald" />
              ) : (
                <XCircle className="h-4 w-4 text-accent-rose" />
              )}
              {formatStatus(s.status)}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              {LANG_LABEL[s.language]} · {s.passedCount}/{s.totalCount} tests
            </div>
          </div>
          <div className="text-right text-xs">
            {s.status === 'accepted' && (
              <div className="font-mono text-zinc-400">
                {s.runtimeMs}ms · {(s.memoryKb / 1024).toFixed(1)}MB
              </div>
            )}
            <div className="text-zinc-500">{new Date(s.createdAt).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] py-1.5">
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

const STATUS_LABEL: Record<Submission['status'], string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  tle: 'Time Limit Exceeded',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
  mle: 'Memory Limit Exceeded',
  execution_error: 'Execution Error',
};
function formatStatus(s: Submission['status']) {
  return STATUS_LABEL[s] ?? s;
}

// Per (slug, language) localStorage code persistence
const codeKey = (slug: string, lang: Language) => `learnhub.code.${slug}.${lang}`;
const readStoredCode = (slug: string, lang: Language) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(codeKey(slug, lang));
};
const writeStoredCode = (slug: string, lang: Language, code: string) => {
  if (typeof window === 'undefined') return;
  if (code) localStorage.setItem(codeKey(slug, lang), code);
};
