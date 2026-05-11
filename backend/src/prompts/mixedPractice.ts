/**
 * Prompt for AI-generated mixed-topic practice roadmaps. The picker only chooses
 * problems from the slugs we provide (so the response stays grounded in our
 * catalog), but writes free-form rationale + a sequenced plan.
 */

export interface MixedPracticeContext {
  topics: string[];
  difficulty: ('Easy' | 'Medium' | 'Hard')[];
  count: number;
  userLevel: string;
  weakTopics: string[];
  strongTopics: string[];
  catalog: Array<{
    slug: string;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    tags: string[];
  }>;
  mode: 'practice' | 'timed' | 'contest';
  durationMinutes?: number;
}

export interface MixedPracticeResponse {
  pickedSlugs: string[];
  reasoning: string;
  difficulty_curve: string;
  weak_topic_focus: string;
  daily_plan: Array<{
    day: number;
    focus: string;
    problems: string[];
  }>;
  expected_outcome: string;
}

export const buildMixedPracticePrompt = (ctx: MixedPracticeContext) => {
  const catalogStr = ctx.catalog
    .slice(0, 80)
    .map((p) => `- ${p.slug} | ${p.difficulty} | tags: ${p.tags.join(', ')} | ${p.title}`)
    .join('\n');

  const modeNote =
    ctx.mode === 'timed'
      ? `TIMED mode: ${ctx.durationMinutes ?? 60} minutes total — favor problems the user can finish without getting stuck.`
      : ctx.mode === 'contest'
        ? `CONTEST mode: ${ctx.durationMinutes ?? 120} minutes total — easy → medium → hard difficulty curve like a real round.`
        : 'PRACTICE mode: no time pressure, prioritize learning over speed.';

  return `You are an elite competitive programming coach designing a personalized mixed-topic practice set.

USER PROFILE:
- Level: ${ctx.userLevel}
- Strong topics: ${ctx.strongTopics.join(', ') || '(none yet)'}
- Weak topics: ${ctx.weakTopics.join(', ') || '(none flagged)'}

REQUEST:
- Topics to mix: ${ctx.topics.join(' + ')}
- Difficulty filter: ${ctx.difficulty.join(', ')}
- Number of problems: ${ctx.count}
- ${modeNote}

CATALOG (you MUST pick from these — do not invent slugs):
${catalogStr}

Pick exactly ${ctx.count} problems from the catalog above that:
1. Cover ALL the requested topics across the set
2. Bias toward weak topics — schedule ~60% of the set there
3. Form a sensible difficulty curve (easier first if practice/contest mode)
4. Combine ≥2 topics per problem when possible (mixed-topic intent)
5. Avoid recommending too many problems on the same day in PRACTICE mode

Return STRICT JSON, nothing else, no fences:
{
  "pickedSlugs": ["..."],
  "reasoning": "2-3 sentence summary of why this set",
  "difficulty_curve": "1 sentence describing the progression",
  "weak_topic_focus": "which weak topics this set targets and how",
  "daily_plan": [
    { "day": 1, "focus": "...", "problems": ["slug-a", "slug-b"] }
  ],
  "expected_outcome": "what the user should be able to do after finishing the set"
}`;
};
