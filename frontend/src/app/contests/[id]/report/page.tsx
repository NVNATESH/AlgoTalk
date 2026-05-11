'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { api, ApiError } from '@/lib/api';
import type { ContestReport } from '@/types/contest';
import { cn } from '@/lib/utils';
import { ResourceList } from '@/components/learning/ResourceList';

export default function ContestReportPage() {
  const params = useParams<{ id: string }>();
  const contestId = params?.id;

  const [report, setReport] = useState<ContestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExisting = async () => {
    if (!contestId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ report: ContestReport | null }>(
        `/contests/${contestId}/report`,
        { auth: true }
      );
      setReport(r.report);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const generate = async (force = false) => {
    if (!contestId) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await api<{ report: ContestReport; cached: boolean }>(
        `/contests/${contestId}/analyze`,
        { method: 'POST', auth: true, body: { force } }
      );
      setReport(r.report);
      toast.success(r.cached ? 'Loaded cached report' : 'Report generated');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Generation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    void fetchExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const downloadReport = () => {
    if (!report) return;
    const lines: string[] = [];
    lines.push('# Contest Report');
    lines.push(`Generated: ${new Date(report.createdAt).toLocaleString()}`);
    lines.push(`Model: ${report.generatedBy}`);
    lines.push('');
    if (report.summary) { lines.push(`## Summary`); lines.push(report.summary); lines.push(''); }
    if (report.whatHappened) { lines.push(`## What Happened`); lines.push(report.whatHappened); lines.push(''); }
    if (report.predictedRatingChange) { lines.push(`**Predicted Rating Change:** ${report.predictedRatingChange}`); lines.push(''); }
    if (typeof report.actualRatingChange === 'number') { lines.push(`**Actual Rating Change:** ${report.actualRatingChange > 0 ? '+' : ''}${report.actualRatingChange}`); lines.push(''); }
    if (report.whatYouDidWell.length > 0) {
      lines.push('## What You Did Well');
      report.whatYouDidWell.forEach((it) => {
        lines.push(`- **${it.point}**`);
        if (it.evidence) lines.push(`  _Evidence: ${it.evidence}_`);
      });
      lines.push('');
    }
    if (report.whereYouStruggled.length > 0) {
      lines.push('## Where You Struggled');
      report.whereYouStruggled.forEach((it) => {
        lines.push(`- **[${it.problem}]** ${it.issue} (${it.timeLostMinutes} min lost)`);
        if (it.rootCause) lines.push(`  _Root cause: ${it.rootCause}_`);
      });
      lines.push('');
    }
    if (report.codeQualityNotes.length > 0) {
      lines.push('## Code Quality Notes');
      report.codeQualityNotes.forEach((it) => lines.push(`- **[${it.problem}]** ${it.note}`));
      lines.push('');
    }
    if (report.howToImprove.length > 0) {
      lines.push('## How to Improve');
      report.howToImprove.forEach((it) => lines.push(`- [${it.priority.toUpperCase()}] ${it.action}`));
      lines.push('');
    }
    if (report.whatToLearnNext.length > 0) {
      lines.push('## What to Learn Next');
      report.whatToLearnNext.forEach((it) => {
        lines.push(`- **${it.topic}** (~${it.estimatedHours}h)`);
        if (it.why) lines.push(`  ${it.why}`);
        if (it.resources?.length) lines.push(`  Resources: ${it.resources.join(', ')}`);
      });
      lines.push('');
    }
    if (report.practicePlan7Days.length > 0) {
      lines.push('## 7-Day Practice Plan');
      report.practicePlan7Days.forEach((d) => {
        lines.push(`### Day ${d.day}`);
        d.problems.forEach((p) => {
          lines.push(`- ${p.title} [${p.platform}] (${p.difficulty || '?'}) — ${p.topic || ''} ~${p.estimatedMinutes}min`);
          if (p.url) lines.push(`  ${p.url}`);
        });
      });
      lines.push('');
    }
    if (report.nextContestRecommendation) {
      lines.push('## Next Contest Recommendation');
      lines.push(report.nextContestRecommendation);
      lines.push('');
    }
    if (report.resources?.length) {
      lines.push('## Resources');
      report.resources.forEach((r) => lines.push(`- [${r.title}](${r.url}) — ${r.topic}: ${r.why}`));
      lines.push('');
    }

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contest-report-${new Date(report.createdAt).toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
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

  return (
    <AppShell>
      <Link
        href="/contests"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" /> All contests
      </Link>

      {!report ? (
        <div className="glass p-10 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-accent-violet/60" />
          <h2 className="mt-3 font-display text-xl font-semibold">No report yet</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Generate a deep AI analysis of this contest based on your registered submissions.
          </p>
          <button onClick={() => generate(false)} disabled={generating} className="btn-primary mt-5">
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate report
          </button>
          {error && <p className="mt-3 text-xs text-accent-rose">{error}</p>}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <header className="glass p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
                  Contest Report · {new Date(report.createdAt).toLocaleDateString()}
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold leading-tight">
                  {report.summary || 'Contest Analysis'}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {report.predictedRatingChange && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-0.5 text-[11px] text-accent-cyan">
                      <TrendingUp className="h-3 w-3" /> Predicted:{' '}
                      {report.predictedRatingChange}
                    </div>
                  )}
                  {typeof report.actualRatingChange === 'number' && (
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums',
                        report.actualRatingChange > 0
                          ? 'border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald'
                          : report.actualRatingChange < 0
                            ? 'border-accent-rose/30 bg-accent-rose/10 text-accent-rose'
                            : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300'
                      )}
                    >
                      Actual:{' '}
                      {report.actualRatingChange > 0 ? '+' : ''}
                      {report.actualRatingChange}
                    </div>
                  )}
                </div>
              </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={downloadReport}
                className="btn-ghost text-xs"
                title="Download report"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                onClick={() => generate(true)}
                disabled={generating}
                className="btn-ghost text-xs"
                title="Regenerate"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Regenerate
              </button>
            </div>
            </div>
            {report.whatHappened && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {report.whatHappened}
              </p>
            )}
          </header>

          {report.whatYouDidWell.length > 0 && (
            <Section icon={CheckCircle2} title="What you did well" tint="emerald">
              <ul className="space-y-2">
                {report.whatYouDidWell.map((it, i) => (
                  <li key={i} className="rounded-lg border border-accent-emerald/15 bg-accent-emerald/5 p-3">
                    <div className="text-sm font-medium text-zinc-100">{it.point}</div>
                    {it.evidence && (
                      <div className="mt-0.5 text-[11px] text-zinc-500">{it.evidence}</div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {report.whereYouStruggled.length > 0 && (
            <Section icon={XCircle} title="Where you struggled" tint="rose">
              <ul className="space-y-2">
                {report.whereYouStruggled.map((it, i) => (
                  <li key={i} className="rounded-lg border border-accent-rose/15 bg-accent-rose/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-100">
                        {it.problem}
                      </span>
                      {it.timeLostMinutes > 0 && (
                        <span className="text-[10px] text-zinc-500">
                          ~{it.timeLostMinutes} min lost
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-zinc-200">{it.issue}</div>
                    {it.rootCause && (
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        <span className="font-semibold text-zinc-400">Root cause:</span>{' '}
                        {it.rootCause}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {report.codeQualityNotes.length > 0 && (
            <Section icon={Lightbulb} title="Code quality notes" tint="amber">
              <ul className="space-y-2">
                {report.codeQualityNotes.map((it, i) => (
                  <li key={i} className="flex gap-2 rounded-lg border border-amber-400/15 bg-amber-400/5 p-3 text-sm">
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                      {it.problem}
                    </span>
                    <span className="text-zinc-200">{it.note}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {report.howToImprove.length > 0 && (
            <Section icon={Target} title="How to improve" tint="violet">
              <ul className="space-y-2">
                {report.howToImprove.map((it, i) => (
                  <li key={i} className="rounded-lg border border-accent-violet/15 bg-accent-violet/5 p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase',
                          it.priority === 'high'
                            ? 'border-accent-rose/40 bg-accent-rose/10 text-accent-rose'
                            : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                        )}
                      >
                        {it.priority}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-200">{it.action}</div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {report.whatToLearnNext.length > 0 && (
            <Section icon={Sparkles} title="What to learn next" tint="cyan">
              <ul className="space-y-2">
                {report.whatToLearnNext.map((it, i) => (
                  <li key={i} className="rounded-lg border border-accent-cyan/15 bg-accent-cyan/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-zinc-100">{it.topic}</div>
                      {it.estimatedHours > 0 && (
                        <span className="text-[10px] text-zinc-500">
                          ~{it.estimatedHours}h
                        </span>
                      )}
                    </div>
                    {it.why && <div className="mt-1 text-[11px] text-zinc-400">{it.why}</div>}
                    {it.resources?.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                        {it.resources.map((r, j) => (
                          <li
                            key={j}
                            className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300"
                          >
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {report.practicePlan7Days.length > 0 && (
            <Section icon={Target} title="7-day practice plan" tint="violet">
              <div className="space-y-3">
                {report.practicePlan7Days.map((d) => (
                  <div key={d.day} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-violet">
                      Day {d.day}
                    </div>
                    <ul className="space-y-1.5">
                      {d.problems.map((p, i) => (
                        <li
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.02] p-2"
                        >
                          <div className="min-w-0 flex-1">
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-sm font-medium text-zinc-100 hover:text-accent-violet"
                            >
                              {p.title}
                              <ArrowUpRight className="ml-1 inline h-3 w-3" />
                            </a>
                            <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-zinc-500">
                              <span>{p.platform}</span>
                              {p.difficulty && (<><span>·</span><span>{p.difficulty}</span></>)}
                              {p.topic && (<><span>·</span><span className="text-accent-violet">{p.topic}</span></>)}
                              {p.estimatedMinutes > 0 && (<><span>·</span><span>~{p.estimatedMinutes}m</span></>)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {report.nextContestRecommendation && (
            <div className="glass border-accent-cyan/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
                    Recommended next contest
                  </div>
                  <p className="mt-1 text-sm text-zinc-200">{report.nextContestRecommendation}</p>
                </div>
              </div>
            </div>
          )}

          {report.resources && report.resources.length > 0 && (
            <Section icon={Sparkles} title="Curated resources" tint="violet">
              <ResourceList resources={report.resources} title="" />
            </Section>
          )}

          <div className="text-right text-[10px] text-zinc-600">
            Generated by {report.generatedBy} · {new Date(report.createdAt).toLocaleString()}
          </div>
        </motion.div>
      )}

      {error && !report && (
        <div className="glass mt-4 p-4">
          <div className="flex items-start gap-2 text-sm text-accent-rose">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Section({
  icon: Icon,
  title,
  tint,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  tint: 'emerald' | 'rose' | 'amber' | 'violet' | 'cyan';
  children: React.ReactNode;
}) {
  const tintMap = {
    emerald: 'text-accent-emerald bg-accent-emerald/15',
    rose: 'text-accent-rose bg-accent-rose/15',
    amber: 'text-amber-300 bg-amber-400/15',
    violet: 'text-accent-violet bg-accent-violet/15',
    cyan: 'text-accent-cyan bg-accent-cyan/15',
  } as const;
  return (
    <section className="glass p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', tintMap[tint])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="font-display text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
