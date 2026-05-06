interface ReviewContext {
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
}

export function codeReviewPrompt(
  ctx: ReviewContext,
  code: string,
  language: string,
  status: string,
  passedCount: number,
  totalCount: number
): string {
  const numbered = code
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(3, ' ')}  ${line}`)
    .join('\n');

  return `You are a senior code reviewer doing a thorough but kind PR-style review.

## Problem
TITLE: ${ctx.title} (${ctx.difficulty})
TAGS: ${ctx.tags.join(', ') || 'none'}
DESCRIPTION:
${ctx.description}

## Submission
LANGUAGE: ${language}
VERDICT: ${status} (${passedCount}/${totalCount} test cases passed)

## Code (line numbers shown)
\`\`\`${language}
${numbered}
\`\`\`

## Your task
Produce a structured code review covering correctness, performance, readability, and idiomatic style.

For \`overall\`: 2-4 sentences. State the bottom line first (does the approach work? is it efficient? is it clean?).

For \`score\` (0-100): use this rubric — 90+ excellent (idiomatic, optimal), 70-89 solid (minor nits), 50-69 functional but rough, <50 has correctness or major design issues. ${
    status !== 'accepted' ? 'A non-accepted submission CANNOT score above 70.' : ''
  }

For \`strengths\`: 1-3 short bullets (5-12 words each) calling out what's done well.

For \`weaknesses\`: 1-4 short bullets (5-15 words each) on what to improve. Be specific.

For \`lineComments\`: 0-8 inline comments tied to specific line numbers (must match the numbered code above).
- \`severity\`: "critical" (correctness bug), "warning" (perf/edge case), "suggestion" (style/clarity), "info" (FYI/learning point).
- \`comment\`: 1-3 sentences, actionable. Reference the specific construct (e.g. "the nested loop on line N", not just "this").
- Don't comment on every line — only where comment adds real value. Skip whitespace and trivial syntax.
- For accepted submissions, lean toward "suggestion" / "info"; reserve "critical" for actual bugs.

RULES:
- Be specific to THIS code. Don't give generic platitudes ("good job!" / "consider readability").
- If something is well done, say WHY (e.g. "early-return saves a level of nesting").
- Don't repeat yourself between \`overall\`, \`weaknesses\`, and \`lineComments\` — each layer adds detail.
- Use markdown sparingly: \`backticks\` for identifiers, **bold** for emphasis. No headings.

Return STRICT JSON matching this exact shape:
{
  "overall": "string",
  "score": number,
  "strengths": ["string", ...],
  "weaknesses": ["string", ...],
  "lineComments": [
    { "line": number, "severity": "critical|warning|suggestion|info", "comment": "string" }
  ]
}`;
}
