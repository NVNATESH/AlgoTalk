import type { ProgressContext } from '../services/analyzerService.js';

export interface ProgressInsightsResponse {
  strengths: string[];
  weaknesses: string[];
  learning_gaps: string[];
  roadmap: Array<{ week: number; focus: string; problems: string[] }>;
  daily_goal: string;
  difficulty_progression: string;
  summary: string; // 2-3 sentence high-level read
}

export function progressInsightsPrompt(ctx: ProgressContext): string {
  return `You are an expert competitive-programming coach analyzing a learner's progress.

USER STATS:
- Distinct problems solved: ${ctx.totalSolved}
- Acceptance rate: ${ctx.acceptanceRate}%
- By difficulty: Easy ${ctx.byDifficulty.Easy.solved}/${ctx.byDifficulty.Easy.total}, Medium ${ctx.byDifficulty.Medium.solved}/${ctx.byDifficulty.Medium.total}, Hard ${ctx.byDifficulty.Hard.solved}/${ctx.byDifficulty.Hard.total}
- Active goals: ${ctx.goalsActive} / Completed goals: ${ctx.goalsCompleted}
- Languages used: ${ctx.byLanguage.map((l) => `${l.language} (${l.count} subs, ${l.acceptanceRate}% acc)`).join(', ') || 'none'}

TOPIC MASTERY (computed from accepted submissions):
${
  ctx.topicMastery.length === 0
    ? '(none — user has not attempted enough problems to gauge topic strengths yet)'
    : ctx.topicMastery
        .slice(0, 12)
        .map(
          (t) =>
            `- ${t.topic}: solved ${t.solved}/${t.attempted} attempted, mastery ${t.mastery}%, trend ${t.recentTrend}`
        )
        .join('\n')
}

GUIDELINES:
- If totals are very small (< 5 solved), keep advice small and specific. Don't fabricate strengths.
- "strengths" / "weaknesses" should be specific topic names from the data — only include topics with actual evidence.
- "learning_gaps" should call out important areas they haven't touched at all (e.g. "no tree problems attempted").
- "roadmap" is a 3-4 week plan. Each week has a focus area and 3-5 specific problem types to drill.
- "daily_goal" is one sentence with a concrete daily target.
- "difficulty_progression" is one sentence on whether to ramp up, hold steady, or drill basics.
- "summary" is 2-3 sentences in the second person — direct, no fluff.

Return STRICT JSON (no fences) matching:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "learning_gaps": ["string"],
  "roadmap": [{"week": 1, "focus": "string", "problems": ["string"]}],
  "daily_goal": "string",
  "difficulty_progression": "string",
  "summary": "string"
}`;
}

export interface CodeAnalysisResponse {
  complexity: { time: string; space: string };
  score: number; // 0-100
  readability: string;
  bottlenecks: string[];
  anti_patterns: string[];
  edge_cases_missed: string[];
  suggestions: string[];
  optimized_code: string;
  problem_lines: Array<{ line: number; issue: string }>;
}

export function codeAnalysisPrompt(input: {
  code: string;
  language: string;
  problemContext?: string;
  staticHints?: string;
}): string {
  return `You are a senior engineer reviewing code in a competitive-programming context.

LANGUAGE: ${input.language}
${input.problemContext ? `PROBLEM CONTEXT:\n${input.problemContext}\n` : ''}
${input.staticHints ? `STATIC ANALYSIS HINTS (computed by our parser; trust these):\n${input.staticHints}\n` : ''}
CODE:
\`\`\`${input.language}
${input.code}
\`\`\`

Analyze this code rigorously.

QUALITY RULES:
- "complexity" must be precise Big-O. If you can't tell, write "unknown".
- "score" 0-100 — penalize for high complexity, missing edge cases, anti-patterns, unclear naming.
- "readability" is one sentence — honest, not flattering.
- "bottlenecks": 0-3 most impactful slowdowns or memory issues. Be specific (cite operations).
- "anti_patterns": 0-3 design or idiom issues (e.g. "magic constants", "mutating input array", "unnecessary deep copy").
- "edge_cases_missed": cases the code might fail on (empty input, single element, max size, negative numbers, etc.). 0-4 items.
- "suggestions": 2-4 concrete improvements. Avoid generic advice.
- "optimized_code": same language, same I/O contract, fixing the issues you identified. If the code is already optimal, return it unchanged with a comment explaining why.
- "problem_lines": specific line numbers (counting from 1) where issues live. line numbers must be valid for the input code.

If the code has a syntax error, set score low, complexity to "unknown", and put the error in "problem_lines".

Return STRICT JSON (no fences):
{
  "complexity": { "time": "O(...)", "space": "O(...)" },
  "score": number,
  "readability": "string",
  "bottlenecks": ["string"],
  "anti_patterns": ["string"],
  "edge_cases_missed": ["string"],
  "suggestions": ["string"],
  "optimized_code": "string",
  "problem_lines": [{"line": number, "issue": "string"}]
}`;
}

export interface RecommendationResponse {
  pickedSlug: string | null;
  alternatives: string[]; // up to 3 backup slugs
  reasoning: string; // why this is the right next problem
  what_to_focus_on: string; // 1 sentence on the technique to emphasize
}

export function recommendNextProblemPrompt(input: {
  ctx: ProgressContext;
  unattempted: Array<{
    slug: string;
    title: string;
    difficulty: string;
    tags: string[];
    cfEquivRating: number | null;
  }>;
}): string {
  const opts = input.unattempted.slice(0, 30).map((p) => ({
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags,
    // Estimated CF-equivalent rating (rounded to 100). null = unestimated.
    cfRating: p.cfEquivRating,
  }));

  const zone = input.ctx.cfRatingZone;
  const zoneSection = zone
    ? `

CODEFORCES SKILL ZONE (from external solves):
- Ceiling (hardest accepted): ${zone.ceiling}
- Comfort band: ${
        zone.comfortBand
          ? `${zone.comfortBand.low}–${zone.comfortBand.high + 99} at ${zone.comfortBand.acceptanceRate}% acceptance (consistently solving here)`
          : 'no consistent band yet'
      }
- Growth band: ${
        zone.growthBand
          ? `${zone.growthBand.low}–${zone.growthBand.high + 99} at ${zone.growthBand.acceptanceRate}% acceptance (the natural next stretch)`
          : 'no data above their ceiling yet'
      }`
    : '';

  return `You are picking the SINGLE BEST next problem for this user, from a fixed list.

USER STATS:
- Distinct solved: ${input.ctx.totalSolved}
- Acceptance rate: ${input.ctx.acceptanceRate}%
- By difficulty: Easy ${input.ctx.byDifficulty.Easy.solved}/${input.ctx.byDifficulty.Easy.total}, Medium ${input.ctx.byDifficulty.Medium.solved}/${input.ctx.byDifficulty.Medium.total}, Hard ${input.ctx.byDifficulty.Hard.solved}/${input.ctx.byDifficulty.Hard.total}

TOPIC MASTERY:
${
  input.ctx.topicMastery.length === 0
    ? '(none yet)'
    : input.ctx.topicMastery.slice(0, 10).map((t) => `- ${t.topic}: ${t.mastery}% mastery (${t.solved}/${t.attempted}, ${t.recentTrend})`).join('\n')
}${zoneSection}

UNATTEMPTED PROBLEMS (you must pick ONE slug from this list):
${JSON.stringify(opts)}

DECISION RULES:
- Prefer a problem that exercises a topic with low mastery (or an unstarted topic).
- Don't pick something far above their current level. Match their typical difficulty (or one notch up).${
    zone
      ? `
- A CF SKILL ZONE is shown above. Each candidate carries a \`cfRating\` field (estimated CF-equivalent rating, null when unestimated). Strongly prefer candidates whose \`cfRating\` lies inside the growth band ${zone.growthBand ? `${zone.growthBand.low}–${zone.growthBand.high + 99}` : '(top of comfort + 300pt)'}; second choice is the upper half of the comfort band ${zone.comfortBand ? `${zone.comfortBand.low}–${zone.comfortBand.high + 99}` : ''}.
- If no candidate falls in the growth band, pick the candidate with the highest \`cfRating\` that's still ≤ ceiling+100 (don't jump multiple tiers).
- Treat null \`cfRating\` as a tiebreaker only — pick numerically rated candidates first.
- In "reasoning", reference the comfort/growth bands by their actual rating numbers and cite the picked problem's \`cfRating\` (e.g. "you're 91% at 1500–1899 but only 75% at 1900–2199 — this 1900-rated problem lands in the growth band").`
      : ''
  }
- "alternatives" — up to 3 other slugs from the list, ranked.
- "reasoning" — 2 sentences max. Reference their stats specifically.
- "what_to_focus_on" — 1 sentence on the technique they should think about first.

If the unattempted list is empty, set pickedSlug to null.

Return STRICT JSON (no fences):
{
  "pickedSlug": "string or null",
  "alternatives": ["string"],
  "reasoning": "string",
  "what_to_focus_on": "string"
}`;
}
