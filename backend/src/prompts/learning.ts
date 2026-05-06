export interface RoadmapInput {
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  weeklyHours?: number;
  deadlineDays?: number;
  notes?: string;
}

export interface GeneratedModule {
  title: string;
  description: string;
  topics: string[];
  estimatedHours: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface GeneratedRoadmap {
  name: string;
  icon: string;
  description: string;
  estimatedHours: number;
  modules: GeneratedModule[];
  rationale: string;
}

export function roadmapPrompt(input: RoadmapInput): string {
  const target = input.difficulty;
  const hours = input.weeklyHours ?? 8;
  const days = input.deadlineDays ?? 30;

  return `You are an expert learning coach. Design a focused, progressive learning roadmap.

USER REQUEST:
- Topic: ${input.topic}
- Target level: ${target}
- Weekly hours available: ${hours}
- Target completion: ${days} days
${input.notes ? `- Additional notes: ${input.notes}` : ''}

CONSTRAINTS:
- Generate 5–10 modules ordered from foundations to advanced.
- Each module is a concrete, learnable unit (1–8 hours).
- Sum of estimatedHours should fit roughly into ${hours * (days / 7)} hours total.
- Prefer practical, problem-solving topics over theory dumps.
- Pick a single relevant emoji for the goal "icon".

Return STRICT JSON only (no prose, no markdown fences) matching this schema:
{
  "name": "string (concise goal name, max 60 chars)",
  "icon": "single emoji",
  "description": "1–2 sentence description of the goal",
  "estimatedHours": number,
  "modules": [
    {
      "title": "string (max 60 chars)",
      "description": "1 sentence describing what the learner will master",
      "topics": ["3–6 short topic tags"],
      "estimatedHours": number,
      "difficulty": "Easy" | "Medium" | "Hard"
    }
  ],
  "rationale": "2 sentences on why this ordering works"
}`;
}

export interface ModuleContext {
  goalName: string;
  goalDifficulty: string;
  moduleTitle: string;
  moduleDescription: string;
  topics: string[];
  difficulty: string;
}

export interface GeneratedExample {
  title: string;
  explanation: string;
  code: string;
  language: string;
}

export interface ConceptsResponse {
  concepts: string; // markdown
  examples: GeneratedExample[];
}

export function conceptsPrompt(ctx: ModuleContext): string {
  return `You are an expert technical tutor. Write learning material for one module of a larger goal.

GOAL: ${ctx.goalName} (level: ${ctx.goalDifficulty})
MODULE: ${ctx.moduleTitle} (${ctx.difficulty})
DESCRIPTION: ${ctx.moduleDescription}
TOPICS: ${ctx.topics.join(', ')}

WRITE TWO PIECES:

1. "concepts" — A focused, well-structured markdown explainer (400–700 words). Use:
   - ## Section headings for major sub-topics
   - **Bold** key terms on first mention
   - Bulleted lists for properties / steps
   - \`inline code\` for identifiers
   - Fenced \`\`\`code blocks\`\`\` (specify language) for short illustrative snippets
   - At least one "When to use" or "Common pitfalls" section
   - End with a 1–2 sentence "Key takeaways" summary
   - Do NOT include a title — start directly with the first ## heading.

2. "examples" — 2–3 concrete, runnable examples that build intuition. Each example has:
   - title (max 60 chars)
   - explanation (2–4 sentences walking through the idea)
   - code (a short snippet, 5–25 lines)
   - language (e.g. "python", "javascript", "cpp", "java" — pick the most appropriate)

Return STRICT JSON only (no prose, no markdown fences around the whole thing) matching this schema:
{
  "concepts": "string (full markdown)",
  "examples": [
    { "title": "string", "explanation": "string", "code": "string", "language": "string" }
  ]
}`;
}

export type QuizQuestionType =
  | 'mcq_single'
  | 'mcq_multi'
  | 'fill_blank'
  | 'match'
  | 'true_false';

export interface GeneratedQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  explanation?: string;
  points?: number;
  options?: string[];
  correctIndex?: number;
  correctIndices?: number[];
  blanks?: string[];
  pairs?: Array<{ left: string; right: string }>;
  correct?: boolean;
}

export function quizPrompt(ctx: ModuleContext): string {
  return `You are an expert technical tutor. Build a mixed-format quiz for one module.

GOAL: ${ctx.goalName}
MODULE: ${ctx.moduleTitle} (${ctx.difficulty})
TOPICS: ${ctx.topics.join(', ')}

Generate exactly 8 questions, mixed across these types:
- 3 of type "mcq_single" (single correct answer from 4 options)
- 1 of type "mcq_multi" (2–3 correct answers from 4 options)
- 2 of type "fill_blank" (the prompt has 1 blank shown as "_____", and "blanks" is an array of one string with pipe-separated acceptable answers, e.g. "O(n log n)|n log n")
- 1 of type "match" (3–4 left/right pairs to be matched)
- 1 of type "true_false"

QUALITY:
- Avoid trivia. Every question should test understanding of a core concept from the topics.
- Vary difficulty: at least 2 should be application-style ("Given X, what's Y?").
- Keep prompts concise; use \`backticks\` for code identifiers.
- Provide a 1–2 sentence "explanation" for each correct answer (used as feedback after submit).
- Each question gets points: 1 (easy), 2 (medium), 3 (hard).

Return STRICT JSON only (no prose, no markdown fences) matching this schema:
{
  "questions": [
    {
      "id": "q1",                              // q1..q8
      "type": "mcq_single" | "mcq_multi" | "fill_blank" | "match" | "true_false",
      "prompt": "string",
      "explanation": "string",
      "points": number,
      "options": ["..."],                     // mcq_*
      "correctIndex": 0,                       // mcq_single
      "correctIndices": [0, 2],                // mcq_multi
      "blanks": ["accepted1|accepted2"],        // fill_blank
      "pairs": [{ "left": "A", "right": "1" }],// match
      "correct": true                          // true_false
    }
  ]
}

Only include the field(s) relevant to that question's type.`;
}

export interface MentorContext {
  goalName: string;
  goalDifficulty: string;
  currentModule?: {
    title: string;
    description: string;
    topics: string[];
    difficulty: string;
  };
  recentWeakTopics?: string[];
}

export function mentorSystemPrompt(ctx: MentorContext): string {
  const lines = [
    `You are LearnHub Mentor — an AI tutor embedded in the user's learning workspace.`,
    ``,
    `LEARNER'S GOAL: ${ctx.goalName} (${ctx.goalDifficulty})`,
  ];

  if (ctx.currentModule) {
    lines.push(
      `CURRENT MODULE: ${ctx.currentModule.title} (${ctx.currentModule.difficulty})`,
      `MODULE DESCRIPTION: ${ctx.currentModule.description}`,
      `MODULE TOPICS: ${ctx.currentModule.topics.join(', ') || '(none)'}`
    );
  }

  if (ctx.recentWeakTopics?.length) {
    lines.push(`RECENT WEAK TOPICS: ${ctx.recentWeakTopics.join(', ')}`);
  }

  lines.push(
    ``,
    `STYLE:`,
    `- Be concise. Aim for under 200 words unless they explicitly ask for depth.`,
    `- Use markdown freely: **bold**, lists, fenced code blocks (specify language).`,
    `- Inline code: \`like_this\` for identifiers / API names.`,
    `- If they're stuck, ask one focused clarifying question instead of dumping theory.`,
    `- Connect answers back to their current module when it makes sense.`,
    `- For code questions, show a minimal correct example, then explain the key idea in 2 sentences.`,
    `- Never reveal answers to a quiz they're currently taking — instead, point them at the relevant concept.`,
    `- Don't apologize, don't use filler ("Great question!"). Get to the point.`
  );

  return lines.join('\n');
}
