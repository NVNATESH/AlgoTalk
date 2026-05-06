interface ProblemContext {
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
}

export function hintPrompt(ctx: ProblemContext, userCode?: string): string {
  return `You are a coding mentor. The user is solving this problem:

TITLE: ${ctx.title} (${ctx.difficulty})
TAGS: ${ctx.tags.join(', ') || 'none'}
DESCRIPTION:
${ctx.description}

${userCode ? `THEIR CURRENT CODE:\n\`\`\`\n${userCode}\n\`\`\`\n` : ''}

Give ONE concise hint (3-5 sentences) that nudges them in the right direction.
RULES:
- Do NOT reveal the full algorithm or write code.
- Do NOT just restate the problem.
- If they have code: identify the conceptual gap, not specific syntax.
- Use markdown sparingly: **bold** key concepts, \`backticks\` for identifiers.
- Stop after one hint — don't pad with "let me know if...".

Return STRICT JSON: { "hint": "..." }`;
}

export function explainProblemPrompt(ctx: ProblemContext): string {
  return `You are a coding mentor. Explain this problem clearly:

TITLE: ${ctx.title} (${ctx.difficulty})
TAGS: ${ctx.tags.join(', ') || 'none'}
DESCRIPTION:
${ctx.description}

Write a 200-300 word markdown explanation with:
1. **What's being asked** (1-2 sentences in your own words)
2. **Key insight** (the core observation that unlocks the problem)
3. **Approach sketch** (the algorithm in 3-5 steps — high level, no code)
4. **Complexity** (expected time/space for the standard solution)
5. **Edge cases** to watch for

Do NOT write a full solution. Use code only for tiny illustrative snippets if absolutely needed.

Return STRICT JSON: { "explanation": "...markdown..." }`;
}

export function explainCodePrompt(ctx: ProblemContext, code: string, language: string): string {
  return `You are a coding mentor. Walk through what the user's code does:

PROBLEM: ${ctx.title}
LANGUAGE: ${language}
CODE:
\`\`\`${language}
${code}
\`\`\`

Write a 150-250 word markdown breakdown:
1. **What this code does** (1-2 sentences high-level)
2. **Step-by-step** (key blocks/loops, what they accomplish — be specific)
3. **Complexity** (time + space)
4. **Bugs or issues** if any (be honest if the code is broken or wrong-approach; cite the line concept)

Don't rewrite the code; just explain it. Be precise — name variables and operations from the actual code.

Return STRICT JSON: { "explanation": "...markdown..." }`;
}

export function optimizePrompt(ctx: ProblemContext, code: string, language: string): string {
  return `You are a coding mentor. The user wants to optimize their solution:

PROBLEM: ${ctx.title} (${ctx.difficulty})
LANGUAGE: ${language}
CURRENT CODE:
\`\`\`${language}
${code}
\`\`\`

Analyze their solution and suggest a better approach.
Return STRICT JSON:
{
  "currentComplexity": { "time": "O(...)", "space": "O(...)" },
  "targetComplexity": { "time": "O(...)", "space": "O(...)" },
  "suggestions": ["short bullet 1", "short bullet 2", "short bullet 3"],
  "optimizedCode": "// the optimized version, in ${language}, with brief comments"
}

If their solution is already optimal, set targetComplexity = currentComplexity, suggestions = ["Already optimal — well done."], and return their code unchanged in optimizedCode.`;
}
