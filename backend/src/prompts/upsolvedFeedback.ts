/**
 * Structured 7-section "Upsolved AI Feedback" — used after a user fails a
 * problem (WA / TLE / gave up) and wants a deep retrospective. Designed to
 * round-trip cleanly as JSON so the frontend can render each section as a
 * separate collapsible card without parsing free-form prose.
 */

export interface UpsolvedFeedbackInput {
  problemTitle: string;
  problemSlug: string;
  problemDescription: string;
  difficulty: string;
  tags: string[];
  userCode: string;
  userLanguage: string;
  failureSummary: string;
  attemptCount: number;
  userLevel: string;
  weakTopics: string[];
  recentSolved: string[];
}

export interface UpsolvedFeedbackResponse {
  problem_summary: {
    understanding: string;
    core_concepts: string[];
  };
  mistake_analysis: {
    why_failed: string;
    logic_mistakes: string[];
    edge_case_mistakes: string[];
    complexity_issues: string[];
    debugging_mistakes: string[];
  };
  optimal_solution: {
    best_approach: string;
    alternative_approaches: string[];
    complexity_comparison: string;
    pseudocode: string;
  };
  learning_recommendations: {
    related_algorithms: string[];
    related_data_structures: string[];
    math_formulas: string[];
    similar_problems: Array<{ slug: string; title: string; reason: string }>;
    practice_roadmap: Array<{ step: number; goal: string; days: number }>;
  };
  mentor_suggestions: {
    what_to_improve: string[];
    interview_tips: string[];
    contest_tips: string[];
    pattern_recognition: string;
  };
  resource_recommendations: {
    articles: Array<{ title: string; url?: string; why: string }>;
    documentation: Array<{ title: string; url?: string; why: string }>;
    videos: Array<{ title: string; channel?: string; why: string }>;
    repositories: Array<{ title: string; url?: string; why: string }>;
  };
  retry_strategy: {
    reattempt_steps: string[];
    improvement_path: string;
    target_time: string;
  };
}

export const buildUpsolvedFeedbackPrompt = (input: UpsolvedFeedbackInput) => `
You are an elite competitive programming coach giving deeply personalized "upsolve"
feedback. The user JUST failed this problem (or gave up). Your job is to be
specific, kind, and actionable — every section must reference THEIR code, THEIR
mistakes, and THEIR skill level.

PROBLEM
- Title: ${input.problemTitle}
- Slug: ${input.problemSlug}
- Difficulty: ${input.difficulty}
- Tags: ${input.tags.join(', ') || '(none)'}

PROBLEM STATEMENT
${input.problemDescription.slice(0, 4000)}

USER ATTEMPT (${input.userLanguage}, ${input.attemptCount} attempts so far)
\`\`\`${input.userLanguage}
${input.userCode.slice(0, 8000)}
\`\`\`

FAILURE SIGNAL: ${input.failureSummary}

USER PROFILE
- Level: ${input.userLevel}
- Weak topics: ${input.weakTopics.join(', ') || '(none flagged)'}
- Recent solved (for similar-problem suggestions, avoid repeating): ${input.recentSolved.join(', ') || '(none)'}

Return STRICT JSON with all 7 top-level keys exactly as below — no prose, no fences:
{
  "problem_summary": {
    "understanding": "1-2 sentences restating the problem in plain language",
    "core_concepts": ["concept1", "concept2"]
  },
  "mistake_analysis": {
    "why_failed": "1-2 sentence root cause referencing the user's code",
    "logic_mistakes": ["..."],
    "edge_case_mistakes": ["..."],
    "complexity_issues": ["..."],
    "debugging_mistakes": ["..."]
  },
  "optimal_solution": {
    "best_approach": "name + 2-3 sentence sketch",
    "alternative_approaches": ["..."],
    "complexity_comparison": "best=O(?) memory=O(?) vs user code O(?)",
    "pseudocode": "<pseudocode block, no language-specific syntax>"
  },
  "learning_recommendations": {
    "related_algorithms": ["..."],
    "related_data_structures": ["..."],
    "math_formulas": ["..."],
    "similar_problems": [
      { "slug": "<our-platform-slug-if-known>", "title": "...", "reason": "..." }
    ],
    "practice_roadmap": [
      { "step": 1, "goal": "...", "days": 2 }
    ]
  },
  "mentor_suggestions": {
    "what_to_improve": ["..."],
    "interview_tips": ["..."],
    "contest_tips": ["..."],
    "pattern_recognition": "1-2 sentence note on the underlying pattern they should now recognize"
  },
  "resource_recommendations": {
    "articles": [{ "title": "...", "url": "https://...", "why": "..." }],
    "documentation": [{ "title": "...", "url": "https://...", "why": "..." }],
    "videos": [{ "title": "...", "channel": "...", "why": "..." }],
    "repositories": [{ "title": "...", "url": "https://...", "why": "..." }]
  },
  "retry_strategy": {
    "reattempt_steps": ["1. ...", "2. ..."],
    "improvement_path": "how to grow from here in 1-2 weeks",
    "target_time": "e.g. solve in <30 min on next attempt"
  }
}

Hard rules:
- NEVER fabricate URLs you don't know are real. Prefer omitting the url field over guessing.
- Stay grounded in this user's specific code — quote line ranges where helpful.
- If a section truly doesn't apply, return an empty array, NOT a placeholder.
`;
