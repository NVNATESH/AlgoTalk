'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Copy,
  Loader2,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { CodeEditor } from '@/components/problem/CodeEditor';
import { api, ApiError } from '@/lib/api';
import type { CodeAnalysis } from '@/types/analyzer';
import type { Language } from '@/types/problem';
import { cn } from '@/lib/utils';

const LANG_LABEL: Record<Language, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
};

const STARTER: Record<Language, string> = {
  python: `# Paste any code here and click Analyze.
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
`,
  javascript: `// Paste any code here and click Analyze.
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
}
`,
  java: `// Paste any code here and click Analyze.
import java.util.*;
class Solution {
  public int[] twoSum(int[] nums, int target) {
    Map<Integer,Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
      if (seen.containsKey(target - nums[i])) return new int[]{seen.get(target - nums[i]), i};
      seen.put(nums[i], i);
    }
    return new int[]{};
  }
}
`,
  cpp: `// Paste any code here and click Analyze.
#include <bits/stdc++.h>
using namespace std;
vector<int> twoSum(vector<int>& nums, int t) {
    unordered_map<int,int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (seen.count(t - nums[i])) return {seen[t - nums[i]], i};
        seen[nums[i]] = i;
    }
    return {};
}
`,
};

export function CodeAnalyzerTab() {
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState(STARTER.python);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null);

  const onLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(STARTER[lang]);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.error('Paste some code first');
      return;
    }
    setAnalyzing(true);
    try {
      const r = await api<{ analysis: CodeAnalysis }>('/analyzer/code', {
        method: 'POST',
        auth: true,
        body: { code, language },
      });
      setAnalysis(r.analysis);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
      {/* Editor */}
      <div className="glass flex h-[600px] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-violet/40"
          >
            {(Object.keys(LANG_LABEL) as Language[]).map((k) => (
              <option key={k} value={k} className="bg-bg-card">
                {LANG_LABEL[k]}
              </option>
            ))}
          </select>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !code.trim()}
            className="btn-primary text-xs"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                <Brain className="h-3.5 w-3.5" /> Analyze
              </>
            )}
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor language={language} value={code} onChange={setCode} />
        </div>
      </div>

      {/* Result panel */}
      <div className="glass max-h-[600px] overflow-y-auto p-5 xl:max-h-[600px]">
        {!analysis && !analyzing && <EmptyState />}
        {analyzing && <LoadingState />}
        {analysis && (
          <AnalysisResult
            analysis={analysis}
            onApply={() => {
              if (analysis.optimized_code) {
                setCode(analysis.optimized_code);
                toast.success('Applied optimized code');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet/30 to-accent-fuchsia/30">
        <Brain className="h-6 w-6 text-accent-violet" />
      </div>
      <h3 className="font-display text-base font-semibold">Paste any code, hit Analyze</h3>
      <p className="mt-1 max-w-[280px] text-xs text-zinc-400">
        Gemini returns complexity, score, bottlenecks, edge cases, and an optimized version.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-zinc-300">
        <Loader2 className="h-4 w-4 animate-spin text-accent-violet" />
        Gemini is reading your code…
      </div>
      <div className="space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-full animate-pulse rounded bg-white/5" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-white/5" />
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

function AnalysisResult({
  analysis,
  onApply,
}: {
  analysis: CodeAnalysis;
  onApply: () => void;
}) {
  const scoreColor =
    analysis.score >= 80
      ? 'text-accent-emerald'
      : analysis.score >= 60
        ? 'text-amber-300'
        : 'text-accent-rose';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Score + complexity */}
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
          <div className={cn('font-display text-3xl font-bold tabular-nums', scoreColor)}>
            {analysis.score}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Score</div>
        </div>
        <div className="flex-1 space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-accent-violet" />
            <span className="text-zinc-500">Time:</span>
            <span className="font-mono font-semibold text-zinc-100">
              {analysis.complexity.time}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-accent-cyan" />
            <span className="text-zinc-500">Space:</span>
            <span className="font-mono font-semibold text-zinc-100">
              {analysis.complexity.space}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">{analysis.readability}</p>
        </div>
      </div>

      {/* Bottlenecks */}
      {analysis.bottlenecks.length > 0 && (
        <Section icon={Zap} tint="amber" title="Bottlenecks">
          {analysis.bottlenecks.map((b, i) => (
            <BulletItem key={i}>{b}</BulletItem>
          ))}
        </Section>
      )}

      {/* Anti-patterns */}
      {analysis.anti_patterns.length > 0 && (
        <Section icon={AlertTriangle} tint="rose" title="Anti-patterns">
          {analysis.anti_patterns.map((b, i) => (
            <BulletItem key={i}>{b}</BulletItem>
          ))}
        </Section>
      )}

      {/* Edge cases missed */}
      {analysis.edge_cases_missed.length > 0 && (
        <Section icon={AlertTriangle} tint="cyan" title="Edge cases to consider">
          {analysis.edge_cases_missed.map((b, i) => (
            <BulletItem key={i}>{b}</BulletItem>
          ))}
        </Section>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <Section icon={Sparkles} tint="violet" title="Suggestions">
          {analysis.suggestions.map((b, i) => (
            <BulletItem key={i}>{b}</BulletItem>
          ))}
        </Section>
      )}

      {/* Problem lines */}
      {analysis.problem_lines.length > 0 && (
        <Section icon={AlertTriangle} tint="amber" title="Lines to look at">
          <ul className="space-y-1 text-xs">
            {analysis.problem_lines.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-300">
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono tabular-nums text-zinc-400">
                  L{p.line}
                </span>
                <span>{p.issue}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Optimized code */}
      {analysis.optimized_code && (
        <Section icon={Wand2} tint="emerald" title="Optimized version">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-bg-card/80">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Code</span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysis.optimized_code);
                    toast.success('Copied');
                  }}
                  className="rounded p-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  title="Copy"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button onClick={onApply} className="btn-primary text-xs">
                  <Wand2 className="h-3 w-3" /> Apply
                </button>
              </div>
            </div>
            <pre className="max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed text-zinc-200">
              <code>{analysis.optimized_code}</code>
            </pre>
          </div>
        </Section>
      )}
    </motion.div>
  );
}

function Section({
  icon: Icon,
  tint,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: 'amber' | 'rose' | 'cyan' | 'violet' | 'emerald';
  title: string;
  children: React.ReactNode;
}) {
  const cls = {
    amber: 'text-amber-300',
    rose: 'text-accent-rose',
    cyan: 'text-accent-cyan',
    violet: 'text-accent-violet',
    emerald: 'text-accent-emerald',
  }[tint];
  return (
    <div>
      <div className={cn('mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider', cls)}>
        <Icon className="h-3 w-3" /> {title}
      </div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-zinc-300">
      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-accent-violet/70" />
      <span className="text-xs leading-relaxed">{children}</span>
    </div>
  );
}
