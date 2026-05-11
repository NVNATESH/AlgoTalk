/**
 * companyPrepPrompt.ts
 *
 * AI prompts for generating company-specific interview preparation goals
 * with recently asked patterns, DSA focus areas, system design topics,
 * HR questions, and topic priority breakdowns.
 */

export interface CompanyPrepInput {
  company: string;
  role?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  weeklyHours?: number;
  deadlineDays?: number;
}

export interface CompanyPrepRoadmap {
  name: string;
  icon: string;
  description: string;
  estimatedHours: number;
  modules: Array<{
    title: string;
    description: string;
    topics: string[];
    estimatedHours: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }>;
  resources: Array<{
    title: string;
    url: string;
    type: 'youtube' | 'docs' | 'blog' | 'github' | 'practice' | 'cheatsheet' | 'pdf' | 'article';
  }>;
  rationale: string;
  topicPriorities: Array<{
    topic: string;
    weight: number;
    reason: string;
  }>;
  recentPatterns: string[];
}

export function companyPrepPrompt(input: CompanyPrepInput): string {
  const role = input.role || 'Software Engineer';
  const difficulty = input.difficulty || 'Intermediate';
  const hours = input.weeklyHours ?? 10;
  const days = input.deadlineDays ?? 30;

  return `You are an expert interview preparation coach specialising in tech company interviews.

COMPANY: ${input.company}
ROLE: ${role}
TARGET LEVEL: ${difficulty}
WEEKLY HOURS: ${hours}
DEADLINE: ${days} days

Design a comprehensive interview preparation roadmap for ${input.company} targeting the ${role} role.

The roadmap MUST include modules covering:
1. DSA problems frequently asked at ${input.company}
2. System Design questions relevant to the role
3. Behavioural / HR round preparation
4. Company-specific coding patterns
5. Mock interview practice

Also generate:
- "topicPriorities": top 6-8 topics ranked by how frequently they appear in ${input.company} interviews, with a weight (0-100) and a short reason.
- "recentPatterns": 5-8 concise strings describing recently asked question patterns (e.g. "Sliding Window on Strings", "LRU Cache Design").
- "resources": 5-10 useful links (use real, popular URLs from YouTube, LeetCode, GeeksForGeeks, NeetCode, etc.)

CONSTRAINTS:
- Generate 6–10 modules ordered from fundamentals to advanced.
- Each module should be 2–8 hours.
- Pick a single relevant emoji for the goal "icon".

Return STRICT JSON only (no prose, no markdown fences) matching this schema:
{
  "name": "string (e.g. 'Google SDE Interview Prep')",
  "icon": "single emoji",
  "description": "1-2 sentence description",
  "estimatedHours": number,
  "modules": [
    {
      "title": "string (max 60 chars)",
      "description": "1 sentence",
      "topics": ["3-6 tags"],
      "estimatedHours": number,
      "difficulty": "Easy" | "Medium" | "Hard"
    }
  ],
  "resources": [
    {
      "title": "string",
      "url": "string (real URL)",
      "type": "youtube" | "docs" | "blog" | "github" | "practice" | "cheatsheet" | "pdf" | "article"
    }
  ],
  "rationale": "2 sentences on why this ordering works",
  "topicPriorities": [
    { "topic": "string", "weight": number, "reason": "string" }
  ],
  "recentPatterns": ["string"]
}`;
}

export interface QuestRoadmapInput {
  topic: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  weeklyHours?: number;
  deadlineDays?: number;
}

export function questRoadmapPrompt(input: QuestRoadmapInput): string {
  const difficulty = input.difficulty || 'Beginner';
  const hours = input.weeklyHours ?? 8;
  const days = input.deadlineDays ?? 45;

  return `You are an expert learning coach designing quest-based learning paths.

TOPIC: ${input.topic}
TARGET LEVEL: ${difficulty}
WEEKLY HOURS: ${hours}
DEADLINE: ${days} days

Design a quest-based sequential learning path for "${input.topic}".
Quests must progress from absolute fundamentals to advanced problem-solving.
Each quest (module) should unlock sequentially — a learner must finish one before starting the next.

Include for each quest:
- Theory concepts
- Practice problems (increasing difficulty)
- A mini-assessment / challenge

Also generate practical resources (YouTube tutorials, documentation, practice platforms).

CONSTRAINTS:
- Generate 6-10 quests ordered sequentially.
- Each quest should be 2-6 hours.
- Pick a single relevant emoji for the goal "icon".

Return STRICT JSON only (no prose, no markdown fences) matching this schema:
{
  "name": "string (e.g. 'DSA Quest: Arrays to Graphs')",
  "icon": "single emoji",
  "description": "1-2 sentence description",
  "estimatedHours": number,
  "modules": [
    {
      "title": "string (max 60 chars)",
      "description": "1 sentence",
      "topics": ["3-6 tags"],
      "estimatedHours": number,
      "difficulty": "Easy" | "Medium" | "Hard"
    }
  ],
  "resources": [
    {
      "title": "string",
      "url": "string (real URL)",
      "type": "youtube" | "docs" | "blog" | "github" | "practice" | "cheatsheet" | "pdf" | "article"
    }
  ],
  "rationale": "2 sentences on why this ordering works"
}`;
}
