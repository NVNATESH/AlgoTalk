/**
 * Cross-platform recommendation prompt — Gemini receives the user's full
 * platform intel (per-platform last submission, weak topics, CF rating zone)
 * and returns 5 specific external problems to attempt next, with reasoning.
 *
 * Unlike the single-pick `recommendNextProblemPrompt`, this returns multiple
 * picks across multiple platforms so the user has variety. Each pick must
 * include a real working URL from the platform — the model is prompted with
 * canonical URL templates so it can construct one without hallucinating an ID.
 */

import type { ProgressContext } from '../services/analyzerService.js';

export interface PlatformPulse {
  platform: string;
  handle: string;
  rating: number | null;
  rank: string;
  submissionCount: number;
  acceptedCount: number;
  lastSubmission: {
    problemTitle: string;
    status: string;
    daysSince: number | null;
  } | null;
}

export interface CrossPlatformRecResponse {
  summary: string;
  recommendations: Array<{
    platform:
      | 'leetcode'
      | 'codeforces'
      | 'codechef'
      | 'hackerrank'
      | 'atcoder'
      | 'gfg'
      | 'hackerearth';
    problemTitle: string;
    problemUrl: string;
    difficulty: string;
    topic: string;
    why: string;
    estimatedTimeMinutes: number;
  }>;
  weakTopicsToDrill: string[];
  pacingAdvice: string;
}

export function crossPlatformRecsPrompt(input: {
  ctx: ProgressContext;
  pulses: PlatformPulse[];
}): string {
  const { ctx, pulses } = input;
  return `You are an elite competitive-programming coach. The user is connected to multiple online judges; pick 5 specific next problems for them across whichever platforms make sense.

USER OVERVIEW:
- Distinct solved (LearnHub catalog): ${ctx.totalSolved} of ${ctx.totalProblems}
- Acceptance rate: ${ctx.acceptanceRate}%
- Difficulty split: Easy ${ctx.byDifficulty.Easy.solved}/${ctx.byDifficulty.Easy.total} · Medium ${ctx.byDifficulty.Medium.solved}/${ctx.byDifficulty.Medium.total} · Hard ${ctx.byDifficulty.Hard.solved}/${ctx.byDifficulty.Hard.total}
- Codeforces rating zone: ${
    ctx.cfRatingZone
      ? `comfort ${ctx.cfRatingZone.comfortBand?.low ?? '?'}-${ctx.cfRatingZone.comfortBand?.high ?? '?'}, growth ${ctx.cfRatingZone.growthBand?.low ?? '?'}-${ctx.cfRatingZone.growthBand?.high ?? '?'}`
      : '(no CF data — recommend something else)'
  }

TOPIC MASTERY (from accepted submissions):
${
  ctx.topicMastery.length === 0
    ? '(none — user is new)'
    : ctx.topicMastery
        .slice(0, 10)
        .map(
          (t) =>
            `- ${t.topic}: ${t.solved}/${t.attempted} solved, mastery ${t.mastery}%, trend ${t.recentTrend}`
        )
        .join('\n')
}

PLATFORM PULSE (most recent activity per connected site):
${
  pulses.length === 0
    ? '(no platforms connected — restrict suggestions to LearnHub catalog and tell the user to connect platforms)'
    : pulses
        .map((p) => {
          const last = p.lastSubmission
            ? `last submission "${p.lastSubmission.problemTitle}" (${p.lastSubmission.status}) ${p.lastSubmission.daysSince ?? '?'} days ago`
            : 'no submissions yet';
          return `- ${p.platform} (handle: ${p.handle}, rating: ${p.rating ?? '—'}, rank: ${p.rank || '—'}): ${p.submissionCount} subs, ${p.acceptedCount} accepted, ${last}`;
        })
        .join('\n')
}

URL TEMPLATES (fill in the {placeholders} with real problem identifiers — do NOT invent IDs that don't exist; you can use famous canonical problems):
- leetcode:    https://leetcode.com/problems/{slug}/
- codeforces:  https://codeforces.com/problemset/problem/{contestId}/{index}
- codechef:    https://www.codechef.com/problems/{CODE}
- atcoder:     https://atcoder.jp/contests/{contest}/tasks/{taskId}
- hackerrank:  https://www.hackerrank.com/challenges/{slug}/problem
- gfg:         https://www.geeksforgeeks.org/problems/{slug}/
- hackerearth: https://www.hackerearth.com/practice/algorithms/{topic}/{slug}/

GUIDELINES:
- Spread the 5 picks across 2-4 different platforms so the user has variety. Don't pile all on one platform.
- Bias picks toward weak topics (low mastery) and the user's growth band on Codeforces.
- If a platform has 0 connected handle, you may still suggest from it — just lower priority.
- For Codeforces, choose problems near (rating zone growth band low) ± 100. Use real, well-known problems (e.g. classic Educational Round entries) when you can.
- "estimatedTimeMinutes" is realistic for the problem's difficulty: easy 15-25, medium 30-50, hard 60-120.
- "topic" should match LearnHub's topic vocabulary: dynamic-programming, graphs, trees, greedy, binary-search, two-pointers, sliding-window, math, strings, arrays, hashing, segment-trees, dfs, bfs.
- "why" must explicitly cite the user's data (a weak topic, the rating zone, time since last submission, etc.). 1 short sentence.
- "summary" is 2-3 sentences with the headline takeaway from their cross-platform stats.
- "weakTopicsToDrill" are 3-5 topic names the user should focus on this week.
- "pacingAdvice" is one sentence on cadence (daily problems, hours/week, etc.).

Return STRICT JSON (no markdown fences):
{
  "summary": "string",
  "recommendations": [
    {
      "platform": "leetcode|codeforces|codechef|hackerrank|atcoder|gfg|hackerearth",
      "problemTitle": "string",
      "problemUrl": "string",
      "difficulty": "Easy|Medium|Hard",
      "topic": "string",
      "why": "string",
      "estimatedTimeMinutes": number
    }
  ],
  "weakTopicsToDrill": ["string"],
  "pacingAdvice": "string"
}
`;
}
