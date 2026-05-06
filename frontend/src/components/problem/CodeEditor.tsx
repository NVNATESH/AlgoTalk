'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { editor as MonacoTypes } from 'monaco-editor';
import type { Language } from '@/types/problem';

const Monaco = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-bg-card/50">
      <Loader2 className="h-6 w-6 animate-spin text-accent-violet" />
    </div>
  ),
});

const MONACO_LANG: Record<Language, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
};

export function CodeEditor({
  language,
  value,
  onChange,
  readOnly = false,
  onMount,
}: {
  language: Language;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  onMount?: (editor: MonacoTypes.IStandaloneCodeEditor) => void;
}) {
  return (
    <Monaco
      height="100%"
      language={MONACO_LANG[language]}
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={onMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontLigatures: true,
        smoothScrolling: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        automaticLayout: true,
        readOnly,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: 'gutter',
        glyphMargin: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}
