'use client';

import { motion } from 'framer-motion';
import {
  Youtube,
  FileText,
  BookOpen,
  Github,
  Code2,
  FileDown,
  ExternalLink,
  Globe,
} from 'lucide-react';

interface Resource {
  title: string;
  url: string;
  type: string;
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  docs: FileText,
  blog: BookOpen,
  github: Github,
  practice: Code2,
  cheatsheet: FileDown,
  pdf: FileDown,
  article: Globe,
};

const TYPE_COLORS: Record<string, string> = {
  youtube: 'text-red-400 bg-red-400/10 border-red-400/20',
  docs: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  blog: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  github: 'text-zinc-300 bg-zinc-400/10 border-zinc-400/20',
  practice: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  cheatsheet: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  pdf: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  article: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
};

export function GoalResources({ resources }: { resources: Resource[] }) {
  if (!resources?.length) return null;

  return (
    <section className="mt-6">
      <h3 className="mb-3 font-display text-lg font-semibold flex items-center gap-2">
        📚 Resources
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {resources.map((r, i) => {
          const Icon = TYPE_ICON[r.type] ?? Globe;
          const color = TYPE_COLORS[r.type] ?? TYPE_COLORS.article;
          return (
            <motion.a
              key={`${r.url}-${i}`}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="glass group flex items-center gap-3 p-3 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-200 group-hover:text-white transition">
                  {r.title}
                </div>
                <div className="truncate text-[10px] text-zinc-500 capitalize">
                  {r.type.replace('_', ' ')}
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:text-zinc-400" />
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}
