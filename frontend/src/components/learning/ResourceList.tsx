'use client';

import { BookOpen, Code2, ExternalLink, FileText, GraduationCap, Github, PlayCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LearningResource {
  type: 'article' | 'video' | 'blog' | 'docs' | 'repo' | 'problem' | 'course';
  title: string;
  url: string;
  topic: string;
  why: string;
}

const TYPE_META: Record<
  LearningResource['type'],
  { icon: typeof BookOpen; tint: string; label: string }
> = {
  article: { icon: FileText, tint: 'text-accent-cyan', label: 'Article' },
  video: { icon: PlayCircle, tint: 'text-accent-rose', label: 'Video' },
  blog: { icon: BookOpen, tint: 'text-accent-violet', label: 'Blog' },
  docs: { icon: FileText, tint: 'text-zinc-300', label: 'Docs' },
  repo: { icon: Github, tint: 'text-zinc-200', label: 'Repo' },
  problem: { icon: Code2, tint: 'text-amber-300', label: 'Practice' },
  course: { icon: GraduationCap, tint: 'text-accent-emerald', label: 'Course' },
};

/**
 * Renders the AI-curated learning recommendations attached to a code review
 * or contest report. Same shape on both surfaces, so the component is shared.
 */
export function ResourceList({
  resources,
  title = 'Recommended next reads',
}: {
  resources: LearningResource[];
  title?: string;
}) {
  if (!resources || resources.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-accent-violet" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {title} · {resources.length}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {resources.map((r, i) => {
          const meta = TYPE_META[r.type] ?? TYPE_META.article;
          const Icon = meta.icon;
          let host = '';
          try {
            host = new URL(r.url).hostname.replace(/^www\./, '');
          } catch {
            host = '';
          }
          return (
            <li
              key={`${r.url}-${i}`}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10 hover:bg-white/[0.04]"
            >
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.tint)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="line-clamp-1 text-sm font-medium text-zinc-100">
                        {r.title}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-zinc-500" />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <span>{meta.label}</span>
                      {host && <><span>·</span><span>{host}</span></>}
                      {r.topic && <><span>·</span><span className="text-zinc-400">{r.topic}</span></>}
                    </div>
                    {r.why && (
                      <p className="mt-1.5 text-xs leading-snug text-zinc-400 line-clamp-2">
                        {r.why}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
