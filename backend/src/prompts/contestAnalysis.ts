interface ContestProblemForPrompt {
  index: string;
  title: string;
  difficulty: string;
  tags: string[];
  status: 'AC' | 'attempted' | 'not_attempted';
  attempts: number;
  acTimeFromStartSec: number | null;
  firstWrongVerdict: string | null;
  userCode: string | null;
  language: string | null;
}

export interface ContestAnalysisInput {
  platform: string;
  contestName: string;
  durationMinutes: number;
  rank: number | null;
  totalParticipants: number | null;
  score: number;
  problems: ContestProblemForPrompt[];
  // Historical context (best-effort)
  recentContestRanks: number[];
  strongTopics: string[];
  weakTopics: string[];
  rating: number | null;
}

export function contestAnalysisPrompt(data: ContestAnalysisInput): string {
  return `You are an elite competitive programming coach. Analyze this contest performance.
Be direct, specific, and actionable. No fluff. No generic advice.

CONTEST: ${data.platform} · ${data.contestName}
USER RANK: ${data.rank ?? 'unranked'}${data.totalParticipants ? ` / ${data.totalParticipants}` : ''}
USER SCORE: ${data.score}
DURATION: ${data.durationMinutes} min

PROBLEMS:
${data.problems
  .map((p) => {
    const code = p.userCode ? `\nUser code (${p.language}):\n\`\`\`\n${p.userCode.slice(0, 1500)}\n\`\`\`` : '';
    const ac = p.acTimeFromStartSec
      ? ` · AC at ${Math.round(p.acTimeFromStartSec / 60)}min`
      : '';
    return `  ${p.index}. "${p.title}" [diff:${p.difficulty || '?'}, tags: ${p.tags.join(', ') || 'none'}]
     Status: ${p.status}${ac} · attempts: ${p.attempts}${
      p.firstWrongVerdict ? ` · first wrong: ${p.firstWrongVerdict}` : ''
    }${code}`;
  })
  .join('\n')}

USER HISTORICAL CONTEXT:
- Recent contest ranks: ${data.recentContestRanks.join(', ') || 'no prior data'}
- Strong topics: ${data.strongTopics.join(', ') || 'unknown'}
- Weak topics: ${data.weakTopics.join(', ') || 'unknown'}
- Current rating estimate: ${data.rating ?? 'unknown'}

Return STRICT JSON (no prose, no fences):
{
  "summary": "1-2 sentence headline takeaway",
  "whatHappened": "3-5 sentence narrative of how the contest went",
  "whatYouDidWell": [
    { "point": "...", "evidence": "Problem A solved in 4min — strong impl" }
  ],
  "whereYouStruggled": [
    { "problem": "C", "issue": "Wrong algorithm — used DP when greedy",
      "rootCause": "Unfamiliar with exchange argument pattern", "timeLostMinutes": 35 }
  ],
  "codeQualityNotes": [
    { "problem": "B", "note": "O(n^2) when O(n log n) expected" }
  ],
  "howToImprove": [
    { "priority": "high", "action": "Practice 5 greedy-with-exchange-argument problems before next round" }
  ],
  "whatToLearnNext": [
    { "topic": "Greedy: exchange argument", "why": "Cost you problem C", "estimatedHours": 4,
      "resources": ["CP-Algorithms greedy section"] }
  ],
  "practicePlan7Days": [
    { "day": 1, "problems": [
        { "platform": "codeforces", "url": "https://codeforces.com/problemset/problem/...",
          "title": "Example problem", "difficulty": "1500", "topic": "greedy", "estimatedMinutes": 30 }
      ]
    }
  ],
  "predictedRatingChange": "+12 to +18",
  "nextContestRecommendation": "Codeforces Round (Div 3) — good rating fit"
}

RULES:
- Reference SPECIFIC problems by their index (A, B, C…) and SPECIFIC observations from the user's code if shown.
- Don't invent problems for the practice plan — use real platforms; if you don't have a specific URL, use the platform's problemset search URL.
- 7-day practice plan: 1-2 problems per day, total 10-15 problems, all aligned to the weaknesses observed THIS contest.
- whatYouDidWell: 1-3 items. whereYouStruggled: up to 4. howToImprove: up to 4. whatToLearnNext: up to 3.
- If rank is missing or all problems were not attempted, infer best guesses but say so explicitly.`;
}
