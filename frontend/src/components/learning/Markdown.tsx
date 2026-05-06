'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-md', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mt-6 mb-3 font-display text-2xl font-bold" {...p} />,
          h2: (p) => (
            <h2
              className="mt-6 mb-3 font-display text-xl font-bold text-zinc-100 first:mt-0"
              {...p}
            />
          ),
          h3: (p) => (
            <h3 className="mt-4 mb-2 font-display text-lg font-semibold text-zinc-100" {...p} />
          ),
          p: (p) => <p className="mb-3 leading-relaxed text-zinc-300" {...p} />,
          ul: (p) => <ul className="mb-3 ml-5 list-disc space-y-1 text-zinc-300" {...p} />,
          ol: (p) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-zinc-300" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          strong: (p) => <strong className="font-semibold text-zinc-100" {...p} />,
          em: (p) => <em className="italic text-zinc-200" {...p} />,
          a: (p) => (
            <a
              className="text-accent-violet underline-offset-4 hover:text-accent-fuchsia hover:underline"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote
              className="my-3 border-l-2 border-accent-violet/40 bg-white/[0.02] py-1 pl-4 italic text-zinc-300"
              {...p}
            />
          ),
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-accent-fuchsia"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            const lang = /language-(\w+)/.exec(className || '')?.[1];
            return (
              <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-bg-card/80">
                {lang && (
                  <div className="border-b border-white/5 bg-white/[0.02] px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    {lang}
                  </div>
                )}
                <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-zinc-200">
                  <code {...props}>{children}</code>
                </pre>
              </div>
            );
          },
          table: (p) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm" {...p} />
            </div>
          ),
          th: (p) => (
            <th
              className="border-b border-white/10 bg-white/5 px-3 py-2 text-left font-semibold text-zinc-200"
              {...p}
            />
          ),
          td: (p) => <td className="border-b border-white/5 px-3 py-2 text-zinc-300" {...p} />,
          hr: () => <hr className="my-5 border-white/10" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
