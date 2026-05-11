'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  ChevronRight,
  HelpCircle,
  Loader2,
  Mic,
  Plus,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { StartInterviewDialog } from '@/components/interview/StartInterviewDialog';
import { api, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import type { InterviewSessionSummary } from '@/types/interview';
import { cn } from '@/lib/utils';

type Tab = 'bank' | 'sessions';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface IQuestion {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  topic: string;
  tags: string[];
  companies: string[];
  platforms: string[];
  frequency: number;
  description?: string;
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'dsa', label: 'DSA' },
  { value: 'system_design', label: 'System Design' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sql', label: 'SQL' },
  { value: 'os', label: 'OS' },
  { value: 'networking', label: 'Networking' },
  { value: 'hr', label: 'HR' },
];

const COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Adobe', 'Flipkart', 'Goldman Sachs', 'TCS', 'Infosys', 'Zoho'];

export default function InterviewPage() {
  const [tab, setTab] = useState<Tab>('bank');

  return (
    <AppShell>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-violet">
          <Mic className="h-3 w-3" /> Interview Practice
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">Interview Prep</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Browse admin-curated questions from top companies, or start an AI mock interview session.
        </p>
      </header>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        <TabBtn active={tab === 'bank'} onClick={() => setTab('bank')} icon={<BookOpen className="h-4 w-4" />} label="Question Bank" />
        <TabBtn active={tab === 'sessions'} onClick={() => setTab('sessions')} icon={<Mic className="h-4 w-4" />} label="My Mock Sessions" />
      </div>

      {tab === 'bank' ? <QuestionBankTab /> : <SessionsTab />}
    </AppShell>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
        active ? 'bg-accent-violet/20 text-accent-violet' : 'text-zinc-400 hover:text-zinc-200'
      )}
    >
      {icon} {label}
    </button>
  );
}

/* ────────────────── Question Bank Tab ────────────────── */
function QuestionBankTab() {
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [company, setCompany] = useState('');
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [prefillTopic, setPrefillTopic] = useState('');

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (difficulty) params.set('difficulty', difficulty);
      if (company) params.set('company', company);
      const res = await api<{ questions: IQuestion[]; total: number }>(`/interview/questions?${params.toString()}`, { auth: true });
      setQuestions(res.questions);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [search, category, difficulty, company]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleMock = (q: IQuestion) => {
    setPrefillTopic(q.topic || q.title);
    setStartOpen(true);
  };

  const handleAddToPath = async (q: IQuestion) => {
    try {
      await api('/interview/questions/add-to-path', {
        method: 'POST',
        body: { questionIds: [q.id], deadlineDays: 30, priority: 'P1' },
        auth: true,
      });
      toast.success(`"${q.title}" added to your learning path!`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to add to learning path');
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="glass mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="input-base pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(category === c.value ? '' : c.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                category === c.value
                  ? 'border-accent-violet/50 bg-accent-violet/20 text-accent-violet'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input-base w-auto text-sm">
          <option value="">All Levels</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <select value={company} onChange={(e) => setCompany(e.target.value)} className="input-base w-auto text-sm">
          <option value="">All Companies</option>
          {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
        </div>
      ) : error ? (
        <div className="glass p-6 text-sm text-accent-rose flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="glass flex flex-col items-center py-16 text-center">
          <HelpCircle className="h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No questions found. Try changing your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="mb-3 text-xs text-zinc-500">{total} questions in the bank</p>
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              expanded={expanded === q.id}
              onToggle={() => setExpanded(expanded === q.id ? null : q.id)}
              onMock={() => handleMock(q)}
              onAddToPath={() => handleAddToPath(q)}
            />
          ))}
        </div>
      )}

      <StartInterviewDialog
        open={startOpen}
        onClose={() => setStartOpen(false)}
        initialTopic={prefillTopic}
      />
    </div>
  );
}

function QuestionCard({
  q, index, expanded, onToggle, onMock, onAddToPath,
}: {
  q: IQuestion; index: number; expanded: boolean; onToggle: () => void; onMock: () => void; onAddToPath: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="glass overflow-hidden"
    >
      <button className="w-full px-5 py-4 text-left" onClick={onToggle}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
              q.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
              q.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
              q.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose',
            )}>
              {q.difficulty}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400 uppercase">{q.category}</span>
            <span className="text-sm font-semibold text-zinc-100">{q.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(q.companies ?? []).slice(0, 3).map((c) => (
              <span key={c} className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-400">{c}</span>
            ))}
            {(q.companies ?? []).length > 3 && (
              <span className="text-[10px] text-zinc-500">+{q.companies.length - 3} more</span>
            )}
            <ChevronRight className={cn('h-4 w-4 text-zinc-500 transition-transform', expanded && 'rotate-90')} />
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Topic: {q.topic} {q.frequency > 0 && `· Asked in ${q.frequency}% interviews`}</p>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-5 py-4 space-y-3">
          {q.description && (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{q.description.slice(0, 600)}{q.description.length > 600 && '…'}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(q.tags ?? []).map((t) => (
              <span key={t} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">#{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-zinc-500">Platforms:</span>
            {(q.platforms ?? []).map((p) => (
              <span key={p} className="rounded bg-accent-violet/10 px-2 py-0.5 text-[10px] text-accent-violet">{p}</span>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onAddToPath} className="btn-ghost text-sm px-4 py-2">
              <Target className="h-3.5 w-3.5" /> Add to Learning Path
            </button>
            <button onClick={onMock} className="btn-primary text-sm px-4 py-2">
              <Mic className="h-3.5 w-3.5" /> Practice with AI
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ────────────────── Sessions Tab ────────────────── */
function SessionsTab() {
  const [sessions, setSessions] = useState<InterviewSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ sessions: InterviewSessionSummary[] }>('/interview', { auth: true })
      .then((r) => !cancelled && setSessions(r.sessions))
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load'); })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setStartOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Start New Interview
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass h-36 animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="glass p-6 flex items-start gap-2 text-sm text-accent-rose">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState onStart={() => setStartOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s, i) => <SessionCard key={s.id} session={s} index={i} />)}
        </div>
      )}

      <StartInterviewDialog open={startOpen} onClose={() => setStartOpen(false)} />
    </div>
  );
}

function SessionCard({ session, index }: { session: InterviewSessionSummary; index: number }) {
  const verdict = session.evaluationVerdict;
  const score = session.evaluationScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
    >
      <Link href={`/interview/${session.id}`} className="glass block p-5 transition hover:border-white/20">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
          <span className={cn(
            'rounded-full border px-2 py-0.5 font-medium',
            session.difficulty === 'Easy' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
            session.difficulty === 'Medium' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            session.difficulty === 'Hard' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
          )}>
            {session.difficulty}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">{session.role}</span>
          <StatusPill status={session.status} />
        </div>
        <h3 className="mt-3 line-clamp-2 font-display text-base font-semibold leading-snug">{session.problemTitle}</h3>
        <p className="mt-1 text-xs text-zinc-500">Topic: {session.topic}</p>
        <div className="mt-4 flex items-center justify-between">
          {verdict ? (
            <div className={cn(
              'flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium',
              verdict === 'pass' && 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald',
              verdict === 'partial' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
              verdict === 'fail' && 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
            )}>
              {verdict.toUpperCase()}
              <span className="font-mono tabular-nums text-zinc-200/90">{score}/100</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">No evaluation yet</span>
          )}
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            {timeAgo(session.startedAt ?? session.createdAt ?? '')}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'in_progress' ? 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet'
    : status === 'submitted' || status === 'completed' ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
    : 'border-white/10 bg-white/5 text-zinc-500';
  const label = status === 'in_progress' ? 'In progress' : status === 'submitted' ? 'Submitted' : status;
  return <span className={cn('rounded-full border px-2 py-0.5 font-medium capitalize', cls)}>{label}</span>;
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="glass flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
        <Mic className="h-7 w-7 text-accent-violet" />
      </div>
      <h3 className="font-display text-2xl font-bold">Practice a real interview</h3>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Pick a topic, speak your approach out loud, write code on a plain whiteboard, and get
        verdict-grade feedback from Gemini playing the interviewer.
      </p>
      <button onClick={onStart} className="btn-primary mt-6">
        <Sparkles className="h-4 w-4" /> Start your first interview
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
