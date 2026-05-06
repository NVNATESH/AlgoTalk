'use client';

import { useEffect, useRef } from 'react';
import type { editor as MonacoTypes } from 'monaco-editor';

export interface ReviewLineComment {
  line: number;
  severity: 'critical' | 'warning' | 'suggestion' | 'info';
  comment: string;
}

const SEVERITY_LABEL: Record<ReviewLineComment['severity'], string> = {
  critical: 'Critical',
  warning: 'Warning',
  suggestion: 'Suggestion',
  info: 'Info',
};

/**
 * Apply AI code-review decorations to a Monaco editor: a colored gutter glyph,
 * a faint line-tint, and a hover tooltip showing the comment.
 *
 * Decorations are recomputed when `comments` or `editor` change, and cleared
 * on unmount.
 */
export function useReviewDecorations(
  editor: MonacoTypes.IStandaloneCodeEditor | null,
  comments: ReviewLineComment[]
) {
  const idsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const lineCount = model.getLineCount();
    const decorations = comments
      .filter((c) => c.line >= 1 && c.line <= lineCount)
      .map((c): MonacoTypes.IModelDeltaDecoration => {
        const lineMax = model.getLineMaxColumn(c.line);
        return {
          range: {
            startLineNumber: c.line,
            startColumn: 1,
            endLineNumber: c.line,
            endColumn: lineMax,
          },
          options: {
            isWholeLine: true,
            glyphMarginClassName: `review-glyph review-glyph-${c.severity}`,
            className: `review-line-${c.severity}`,
            glyphMarginHoverMessage: {
              value: `**${SEVERITY_LABEL[c.severity]}** · L${c.line}\n\n${c.comment}`,
              isTrusted: false,
            },
            hoverMessage: {
              value: `**${SEVERITY_LABEL[c.severity]}** · L${c.line}\n\n${c.comment}`,
              isTrusted: false,
            },
            overviewRuler: {
              color: overviewColor(c.severity),
              position: 4, // monaco.editor.OverviewRulerLane.Right
            },
            minimap: {
              color: overviewColor(c.severity),
              position: 2, // monaco.editor.MinimapPosition.Inline
            },
          },
        };
      });

    idsRef.current = editor.deltaDecorations(idsRef.current, decorations);

    return () => {
      // Best-effort: editor may have been disposed if Monaco unmounted.
      try {
        idsRef.current = editor.deltaDecorations(idsRef.current, []);
      } catch {
        idsRef.current = [];
      }
    };
  }, [editor, comments]);
}

function overviewColor(severity: ReviewLineComment['severity']): string {
  switch (severity) {
    case 'critical':
      return 'rgba(244, 63, 94, 0.7)';
    case 'warning':
      return 'rgba(251, 191, 36, 0.7)';
    case 'suggestion':
      return 'rgba(167, 139, 250, 0.7)';
    case 'info':
      return 'rgba(34, 211, 238, 0.7)';
  }
}
