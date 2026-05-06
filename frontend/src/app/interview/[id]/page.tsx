'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { Markdown } from '@/components/learning/Markdown';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { ProblemSpeaker, buildSpokenScript } from '@/components/interview/ProblemSpeaker';
import { api, ApiError } from '@/lib/api';
import type { ApproachFeedback, InterviewSession } from '@/types/interview';
import { cn } from '@/lib/utils';

const LANGUAGES = ['python', 'javascript', 'java', 'cpp'] as const;
type Lang = (typeof LANGUAGES)[number];

const LANG_LABEL: Record<Lang, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
};

export default function InterviewWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<Lang>('python');

  const [approachOpen, setApproachOpen] = useState(false);
  const [approachLoading, setApproachLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState('');
  const [followUpSending, setFollowUpSending] = useState(false);

  const [elapsed, setElapsed] = useState<number>(0); // seconds
  const followUpRef = useRef<HTMLDivElement>(null);
  const evalAnchorRef = useRef<HTMLDivElement>(null);

  // Voice recognition
  const speech = useSpeechRecognition('en-US');

  // Load session
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api<{ session: InterviewSession }>(`/interview/${id}`, { auth: true })
      .then((r) => {
        if (cancelled) return;
        setSession(r.session);
        setCode(r.session.code ?? '');
        setLanguage((r.session.language as Lang) ?? 'python');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load session');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Live elapsed timer
  useEffect(() => {
    if (!session?.startedAt || session.status !== 'in_progress') return;
    const start = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [session?.startedAt, session?.status]);

  // Auto-scroll follow-up chat
  useEffect(() => {
    if (followUpRef.current && session?.followUps?.length) {
      followUpRef.current.scrollTop = followUpRef.current.scrollHeight;
    }
  }, [session?.followUps?.length]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
        </div>
      </AppShell>
    );
  }

  if (error || !session) {
    return (
      <AppShell>
        <div className="glass mx-auto max-w-md p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-accent-rose" />
          <h2 className="mt-3 font-display text-xl font-semibold">Session unavailable</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <Link href="/interview" className="btn-primary mt-5 inline-flex">
            <ArrowLeft className="h-4 w-4" /> Back to interviews
          </Link>
        </div>
      </AppShell>
    );
  }

  const isLocked = session.status !== 'in_progress';

  const handleGetApproachFeedback = async () => {
    const text = (speech.transcript + ' ' + speech.interim).trim();
    if (text.length < 10) {
      toast.error('Speak a bit more about your approach first.');
      return;
    }
    setApproachLoading(true);
    try {
      if (speech.listening) speech.stop();
      const r = await api<{ session: InterviewSession }>(
        `/interview/${session.id}/approach`,
        { method: 'POST', auth: true, body: { transcript: text } }
      );
      setSession(r.session);
      speech.reset();
      setApproachOpen(true);
      toast.success('Got it — feedback on the right.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Approach feedback failed');
    } finally {
      setApproachLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Write some code first.');
      return;
    }
    if (!confirm('Submit your code? You won\'t be able to edit it after this — like a real interview.'))
      return;
    setSubmitting(true);
    try {
      const r = await api<{ session: InterviewSession }>(`/interview/${session.id}/submit`, {
        method: 'POST',
        auth: true,
        body: { code, language },
      });
      setSession(r.session);
      const verdict = r.session.evaluation?.verdict;
      if (verdict === 'pass') {
        toast.success('✅ Passed — your AI review is ready below.');
      } else if (verdict === 'partial') {
        toast.warning('Partial pass — your review is ready below.');
      } else if (verdict === 'fail') {
        toast.warning('Submission failed — review below explains why.');
      } else {
        toast.success('Submitted — review is ready below.');
      }
      // Bring the evaluation panel into view so the user sees their review
      // immediately rather than having to scroll.
      requestAnimationFrame(() => {
        evalAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFollowUp = async () => {
    const msg = followUpDraft.trim();
    if (!msg) return;
    setFollowUpSending(true);
    setFollowUpDraft('');
    try {
      const r = await api<{ session: InterviewSession }>(
        `/interview/${session.id}/follow-up`,
        { method: 'POST', auth: true, body: { message: msg } }
      );
      setSession(r.session);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Send failed');
      setFollowUpDraft(msg); // restore
    } finally {
      setFollowUpSending(false);
    }
  };

  const onFollowUpKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleFollowUp();
    }
  };

  const lastApproach = session.approachFeedbacks.at(-1);

  return (
    <AppShell>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/interview"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" /> All interviews
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
            {session.role} · {session.difficulty}
          </span>
          {session.status === 'in_progress' && (
            <span className="font-mono text-xs tabular-nums text-zinc-300">
              ⏱ {fmtTime(elapsed)}
            </span>
          )}
          {session.status === 'submitted' && session.durationSeconds && (
            <span className="font-mono text-xs tabular-nums text-zinc-500">
              took {fmtTime(session.durationSeconds)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        {/* LEFT: Problem + Whiteboard */}
        <div className="space-y-4">
          <ProblemPanel problem={session.problem} />

          <Whiteboard
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
            isLocked={isLocked}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </div>

        {/* RIGHT: Voice + Feedback + Evaluation */}
        <aside className="space-y-4">
          {!isLocked && (
            <VoicePanel
              speech={speech}
              loading={approachLoading}
              onSubmit={handleGetApproachFeedback}
              hasFeedback={session.approachFeedbacks.length > 0}
              feedbacksCount={session.approachFeedbacks.length}
            />
          )}

          {/* Latest approach feedback */}
          {lastApproach && (
            <ApproachFeedbackCard
              feedback={lastApproach}
              count={session.approachFeedbacks.length}
              expanded={approachOpen}
              setExpanded={setApproachOpen}
            />
          )}

          {/* Evaluation — anchor scrolls here on submit so the verdict is
              the first thing the user sees. */}
          <div ref={evalAnchorRef} className="scroll-mt-20" />
          {session.evaluation && (
            <EvaluationPanel evaluation={session.evaluation} />
          )}

          {/* Follow-up Q&A */}
          {session.evaluation && (
            <FollowUpPanel
              messages={session.followUps}
              draft={followUpDraft}
              setDraft={setFollowUpDraft}
              sending={followUpSending}
              onSend={handleFollowUp}
              onKey={onFollowUpKey}
              scrollRef={followUpRef}
            />
          )}
        </aside>
      </div>
    </AppShell>
  );
}

/**
 * Compact problem display: title + the spoken-script summary by default,
 * with an expandable section that reveals the full Markdown statement +
 * examples + constraints + hint when the user clicks "Read full problem".
 *
 * The voice player (Web Speech Synthesis) reads only the spoken script —
 * not the full problem — so it stays under ~30 seconds.
 */
function ProblemPanel({ problem }: { problem: InterviewSession['problem'] }) {
  const [expanded, setExpanded] = useState(false);
  const spoken = buildSpokenScript({
    title: problem.title,
    statement: problem.statement,
    examples: problem.examples,
  });
  return (
    <section className="glass p-6">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-violet">
        <Sparkles className="h-3 w-3" /> Generated by Gemini
      </div>
      <h1 className="font-display text-2xl font-bold leading-tight">{problem.title}</h1>

      <div className="mt-3">
        <ProblemSpeaker spokenScript={spoken} excerpt="Tap Listen for a 30-second narration" />
      </div>

      <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-zinc-200">
        {/* The spoken script doubles as a clean, short summary for readers. */}
        {spoken}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent-violet hover:underline"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 transition',
            expanded && 'rotate-90'
          )}
        />
        {expanded ? 'Hide full problem' : 'Read full problem'}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-white/5 pt-4">
          <div className="text-sm">
            <Markdown>{problem.statement}</Markdown>
          </div>
          {problem.examples.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Examples
              </h3>
              {problem.examples.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm"
                >
                  <div className="text-xs font-semibold text-zinc-400">Example {i + 1}</div>
                  <div className="mt-1.5 space-y-1">
                    <KvLine k="Input" v={ex.input} />
                    <KvLine k="Output" v={ex.output} />
                    {ex.explanation && (
                      <p className="text-xs text-zinc-400">
                        <span className="font-medium text-zinc-300">Note: </span>
                        {ex.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {problem.constraints && (
            <div className="mt-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Constraints
              </h3>
              <pre className="mt-1.5 whitespace-pre-wrap rounded-xl border border-white/5 bg-white/[0.02] p-3 font-mono text-xs text-zinc-300">
                {problem.constraints}
              </pre>
            </div>
          )}
          {problem.starterHint && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3 text-xs">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-cyan" />
              <span className="text-zinc-300">
                <span className="font-medium text-accent-cyan">Hint: </span>
                {problem.starterHint}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
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

function Whiteboard({
  code,
  setCode,
  language,
  setLanguage,
  isLocked,
  submitting,
  onSubmit,
}: {
  code: string;
  setCode: (s: string) => void;
  language: Lang;
  setLanguage: (l: Lang) => void;
  isLocked: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <section className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Whiteboard
          </span>
          <span className="text-[10px] text-zinc-600">· no autocomplete · no syntax highlighting</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Lang)}
            disabled={isLocked}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-violet/40 disabled:opacity-50"
          >
            {LANGUAGES.map((k) => (
              <option key={k} value={k} className="bg-bg-card">
                {LANG_LABEL[k]}
              </option>
            ))}
          </select>
          <button
            onClick={onSubmit}
            disabled={isLocked || submitting || !code.trim()}
            className="btn-primary text-xs"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Evaluating…
              </>
            ) : isLocked ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Submit final
              </>
            )}
          </button>
        </div>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        readOnly={isLocked}
        placeholder={
          isLocked
            ? 'This session is submitted — code is locked.'
            : '// Write your solution here. Like a real interview, no autocomplete, no highlights.\n// You only get ONE Submit at the end.\n\n'
        }
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={cn(
          'block h-[420px] w-full resize-y bg-zinc-900/50 px-4 py-4 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none',
          isLocked && 'cursor-not-allowed text-zinc-400'
        )}
        style={{ tabSize: 4 }}
      />
    </section>
  );
}

function VoicePanel({
  speech,
  loading,
  onSubmit,
  hasFeedback,
  feedbacksCount,
}: {
  speech: ReturnType<typeof useSpeechRecognition>;
  loading: boolean;
  onSubmit: () => void;
  hasFeedback: boolean;
  feedbacksCount: number;
}) {
  const liveText = (speech.transcript + ' ' + speech.interim).trim();

  return (
    <section className="glass p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Mic className="h-4 w-4 text-accent-violet" /> Speak your approach
        </h2>
        {hasFeedback && (
          <span className="text-[10px] text-zinc-500">{feedbacksCount} feedback round{feedbacksCount === 1 ? '' : 's'}</span>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Talk through your idea before coding — Gemini plays the interviewer and reacts.
      </p>

      {!speech.supported && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Voice not supported in this browser. You can still type your approach in the box below.
          </span>
        </div>
      )}

      {speech.error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent-rose/30 bg-accent-rose/5 p-3 text-xs text-accent-rose">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {speech.error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {speech.listening ? (
          <button onClick={speech.stop} className="btn-ghost text-xs">
            <MicOff className="h-3.5 w-3.5 text-accent-rose" /> Stop
            <span className="ml-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-accent-rose" />
          </button>
        ) : (
          <button
            onClick={speech.start}
            disabled={!speech.supported || loading}
            className="btn-ghost text-xs disabled:opacity-50"
          >
            <Mic className="h-3.5 w-3.5 text-accent-violet" /> Record
          </button>
        )}
        <button
          onClick={speech.reset}
          disabled={!liveText || loading}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200 disabled:opacity-30"
          title="Clear transcript"
          aria-label="Clear"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 min-h-[80px] rounded-xl border border-white/10 bg-bg-card/50 p-3">
        {liveText ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
            {speech.transcript}
            {speech.interim && (
              <span className="text-zinc-500"> {speech.interim}</span>
            )}
          </p>
        ) : (
          <p className="text-xs italic text-zinc-600">
            {speech.listening
              ? 'Listening… speak your approach.'
              : 'Click Record to start. Or paste your approach below.'}
          </p>
        )}
      </div>

      <button
        onClick={onSubmit}
        disabled={loading || liveText.length < 10}
        className="btn-primary mt-3 w-full text-sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Asking interviewer…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Get approach feedback
          </>
        )}
      </button>
    </section>
  );
}

function ApproachFeedbackCard({
  feedback,
  count,
  expanded,
  setExpanded,
}: {
  feedback: ApproachFeedback;
  count: number;
  expanded: boolean;
  setExpanded: (b: boolean) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass overflow-hidden border',
        feedback.onTrack ? 'border-accent-emerald/30' : 'border-amber-500/30'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {feedback.onTrack ? (
            <CheckCircle2 className="h-5 w-5 text-accent-emerald" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-300" />
          )}
          <div>
            <h3 className="font-display text-sm font-semibold">
              {feedback.onTrack ? 'On the right track' : 'Approach needs work'}
            </h3>
            <p className="text-[10px] text-zinc-500">
              Score {feedback.score}/100 · feedback round {count}
            </p>
          </div>
        </div>
        <ChevronRight className={cn('h-4 w-4 text-zinc-500 transition', expanded && 'rotate-90')} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5 px-5 pb-5"
          >
            <div className="space-y-4 pt-3">
              {feedback.observations.length > 0 && (
                <FbList title="Observations" items={feedback.observations} />
              )}
              {feedback.questionsToConsider.length > 0 && (
                <div>
                  <SectionLabel label="Interviewer asks" />
                  <ul className="mt-2 space-y-1.5">
                    {feedback.questionsToConsider.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <Bot className="mt-0.5 h-3 w-3 shrink-0 text-accent-violet" />
                        <em>{q}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.suggestedDirection && (
                <div className="rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-3 text-sm">
                  <SectionLabel label="Try thinking about" />
                  <p className="mt-1 text-zinc-200">{feedback.suggestedDirection}</p>
                </div>
              )}
              {(feedback.complexity.time || feedback.complexity.space) && (
                <div className="text-xs text-zinc-500">
                  Detected complexity:{' '}
                  <span className="font-mono text-zinc-300">
                    {feedback.complexity.time ?? '?'} / {feedback.complexity.space ?? '?'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function EvaluationPanel({
  evaluation,
}: {
  evaluation: NonNullable<InterviewSession['evaluation']>;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Verdict</h2>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
            evaluation.verdict === 'pass' && 'border-accent-emerald/40 bg-accent-emerald/15 text-accent-emerald',
            evaluation.verdict === 'partial' && 'border-amber-500/40 bg-amber-500/15 text-amber-300',
            evaluation.verdict === 'fail' && 'border-accent-rose/40 bg-accent-rose/15 text-accent-rose'
          )}
        >
          {evaluation.verdict === 'pass' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {evaluation.verdict}
          <span className="font-mono tabular-nums">{evaluation.score}/100</span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-200">{evaluation.summary}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Time</div>
          <div className="mt-0.5 font-mono font-semibold tabular-nums">{evaluation.complexity.time}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Space</div>
          <div className="mt-0.5 font-mono font-semibold tabular-nums">{evaluation.complexity.space}</div>
        </div>
      </div>

      {evaluation.strengths.length > 0 && (
        <div className="mt-4">
          <FbList title="Strengths" items={evaluation.strengths} tint="emerald" />
        </div>
      )}
      {evaluation.weaknesses.length > 0 && (
        <div className="mt-4">
          <FbList title="Weaknesses" items={evaluation.weaknesses} tint="rose" />
        </div>
      )}
      {evaluation.edgeCasesMissed.length > 0 && (
        <div className="mt-4">
          <FbList title="Edge cases missed" items={evaluation.edgeCasesMissed} tint="amber" />
        </div>
      )}
      {evaluation.lineByLine.length > 0 && (
        <div className="mt-4">
          <SectionLabel label="Line-by-line" />
          <ul className="mt-2 space-y-1 text-xs">
            {evaluation.lineByLine.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-300">
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono tabular-nums text-zinc-400">
                  L{l.line}
                </span>
                <span>{l.comment}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}

function FollowUpPanel({
  messages,
  draft,
  setDraft,
  sending,
  onSend,
  onKey,
  scrollRef,
}: {
  messages: InterviewSession['followUps'];
  draft: string;
  setDraft: (s: string) => void;
  sending: boolean;
  onSend: () => void;
  onKey: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <section className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Bot className="h-4 w-4 text-accent-violet" /> Follow-up Q&A
        </h2>
        <span className="text-[10px] text-zinc-500">{Math.floor(messages.length / 2)} exchange{messages.length === 2 ? '' : 's'}</span>
      </div>

      <div ref={scrollRef} className="max-h-[400px] min-h-[200px] overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500">
            Ask the interviewer follow-up questions about your code, alternative approaches, or
            complexity.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => (
              <li
                key={i}
                className={cn(
                  'flex gap-2',
                  m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                    m.role === 'user'
                      ? 'bg-white/10 text-zinc-300'
                      : 'bg-gradient-to-br from-accent-violet to-accent-fuchsia text-white'
                  )}
                >
                  {m.role === 'user' ? '🧑' : '🤖'}
                </div>
                <div
                  className={cn(
                    'max-w-[85%] min-w-0 rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'rounded-tr-sm bg-accent-violet/15 text-zinc-100'
                      : 'rounded-tl-sm bg-white/5 text-zinc-100'
                  )}
                >
                  {m.role === 'interviewer' ? <Markdown>{m.text}</Markdown> : <p className="whitespace-pre-wrap">{m.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-white/5 bg-bg/60 px-3 py-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Ask a follow-up question…"
          className="input-base min-h-[40px] resize-y py-2"
          disabled={sending}
        />
        {sending ? (
          <button className="btn-ghost h-10 px-3" disabled>
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!draft.trim()}
            className="btn-primary h-10 px-3"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}

function FbList({
  title,
  items,
  tint,
}: {
  title: string;
  items: string[];
  tint?: 'emerald' | 'rose' | 'amber';
}) {
  const dot = {
    emerald: 'bg-accent-emerald',
    rose: 'bg-accent-rose',
    amber: 'bg-amber-300',
  } as const;
  return (
    <div>
      <SectionLabel label={title} />
      <ul className="mt-2 space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
            <span
              className={cn(
                'mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full',
                tint ? dot[tint] : 'bg-accent-violet/70'
              )}
            />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {label}
    </div>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
