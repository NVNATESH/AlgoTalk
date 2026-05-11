import type { RewindData } from '../services/rewindService.js';

export interface RewindInsightsResponse {
  narrative: string; // markdown — overall "year in review" paragraph
  highlights: string[]; // 3-5 short bullets
  growthPeriod: string; // "Mar–Apr" with one-sentence why
  productiveMonths: string; // "May was your peak (X solved)..."
  decline: string | null; // null if no clear decline; else explanation
  improvementAreas: string[]; // 2-4 concrete bullet suggestions for next year
  h1VsH2: string; // 1-2 sentence comparison
}

export function rewindInsightsPrompt(data: RewindData, userName: string): string {
  // Compact data for the model — just the numeric story.
  const monthlyJson = data.monthly.map((m) => ({
    month: m.monthLabel,
    submissions: m.submissions,
    accepted: m.accepted,
    distinctSolved: m.distinctSolved,
    activeDays: m.activeDays,
    byDifficulty: m.byDifficulty,
  }));
  const milestonesJson = data.milestones.slice(0, 12).map((ms) => ({
    date: ms.date,
    label: ms.label,
    detail: ms.detail,
  }));

  return `You are writing a "Year in Review" story for ${userName} on AlgoTalk. Tone: warm, motivating, specific. NEVER cheesy. NEVER over-praise.

YEAR: ${data.year}

YEAR TOTALS:
- Distinct problems solved: ${data.totals.distinctSolved}
- Total submissions: ${data.totals.submissions}
- Accepted submissions: ${data.totals.accepted} (${data.totals.avgAcceptanceRate}% acceptance)
- Active days: ${data.totals.activeDays} / 365
- Longest streak: ${data.totals.longestStreak} days
- Difficulty mix solved: Easy ${data.totals.byDifficulty.Easy}, Medium ${data.totals.byDifficulty.Medium}, Hard ${data.totals.byDifficulty.Hard}
- Goals completed: ${data.goalsCompletedThisYear}
- Top language: ${data.topLanguage ? `${data.topLanguage.language} (${data.topLanguage.pct}% of submissions)` : 'n/a'}
- Top topics: ${data.topTopics.map((t) => `${t.topic} (${t.solvedCount})`).join(', ') || 'none'}

MONTHLY:
${JSON.stringify(monthlyJson)}

H1 (Jan–Jun): ${JSON.stringify(data.h1)}
H2 (Jul–Dec): ${JSON.stringify(data.h2)}

KEY MILESTONES:
${JSON.stringify(milestonesJson)}

WRITING RULES:
- Reference real numbers and months from the data — never invent.
- If totals are very small (e.g. <10 submissions), keep tone hopeful but honest — say something like "You were just getting started this year".
- Each bullet/section is short. Avoid filler like "amazing job!" or "you crushed it".
- For growthPeriod: name the month range with the biggest sustained jump in distinctSolved month-over-month. Reference the numbers.
- For decline: only flag if there's a clear multi-month drop — otherwise return null.
- improvementAreas should be concrete (e.g. "Spend more time on Hard problems — you only solved X this year") not generic.

Return STRICT JSON (no markdown fences) matching:
{
  "narrative": "string (markdown, 80–140 words, 1 paragraph or 2 short ones)",
  "highlights": ["string", "string", "string"],
  "growthPeriod": "string (1-2 sentences, names months and numbers)",
  "productiveMonths": "string (1 sentence)",
  "decline": "string or null",
  "improvementAreas": ["string", "string", "string"],
  "h1VsH2": "string (1-2 sentences comparing halves)"
}`;
}
