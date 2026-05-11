export type InterviewMode =
  | 'dsa'
  | 'system_design'
  | 'sql'
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'behavioral'
  | 'cs_fundamentals';

export interface ProblemGenInput {
  topic: string;
  topics?: string[];                  // optional multi-topic mix (DSA/CS-fundamentals modes)
  difficulty: 'Easy' | 'Medium' | 'Hard';
  role: string;
  notes?: string;
  mode?: InterviewMode;               // default 'dsa'
  company?: string;                   // tone the problem after a company's style
}

const MODE_INSTRUCTIONS: Record<InterviewMode, string> = {
  dsa: 'Generate a DSA coding problem. Examples should be input/output pairs. Expected complexity refers to algorithm time/space.',
  system_design: 'Generate a SYSTEM DESIGN scenario. The "statement" should describe a product/scale/scenario. Examples should be representative API requests or back-of-envelope numbers. Expected complexity is irrelevant — leave as "—".',
  sql: 'Generate a SQL problem. Statement describes the schema (with CREATE TABLE snippets in the markdown) plus the question. Examples are SQL query → result table. Expected complexity should describe expected query plan e.g. "single-pass, indexed".',
  frontend: 'Generate a FRONTEND coding question (React/JS). Statement describes UI behavior + constraints. Examples may show desired DOM behavior or interaction.',
  backend: 'Generate a BACKEND/API design question (Node/Java/Python). Statement describes the endpoint/contract. Examples are request → response pairs.',
  fullstack: 'Generate a FULLSTACK feature design question — frontend + backend boundaries explicit. Examples show the user-visible behavior + API contract.',
  behavioral: 'Generate a BEHAVIORAL/STAR-format question for the role. Statement is the prompt; Examples should be 1-2 short reference answers framing what a strong vs weak response looks like (clearly labeled).',
  cs_fundamentals: 'Generate a CS FUNDAMENTALS short-answer question (DBMS/OS/CN/OOP). Statement asks the question; Examples show a strong sample answer + a common mistake.',
};

export interface GeneratedProblem {
  title: string;
  statement: string; // markdown
  constraints: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  expectedComplexity: { time: string; space: string };
  starterHint: string;
}

export function problemPrompt(input: ProblemGenInput): string {
  const mode: InterviewMode = input.mode ?? 'dsa';
  const topicLine =
    input.topics && input.topics.length > 1
      ? `Topics to combine: ${input.topics.join(' + ')}`
      : `Topic: ${input.topic}`;
  const companyLine = input.company
    ? `- Mimic the typical interview style of: ${input.company}`
    : '';

  return `You are an experienced technical interviewer. Generate ONE original interview problem.

CONTEXT:
- ${topicLine}
- Difficulty: ${input.difficulty}
- Role: ${input.role}
- Mode: ${mode}
${companyLine}
${input.notes ? `- User notes: ${input.notes}` : ''}

MODE-SPECIFIC RULES:
${MODE_INSTRUCTIONS[mode]}

QUALITY RULES:
- Don't reuse famous LeetCode titles. Make it original but realistic for this role/difficulty.
- The problem must be solvable in under 30 minutes for the target role.
- The statement uses markdown (headings, lists, code if needed). Tone: clear, no fluff.
- "constraints" lists numeric/structural bounds in plain text (e.g. "1 ≤ n ≤ 10^5", or "schema: 3 tables, max 1M rows").
- 2 examples with input/output and a one-sentence explanation. (For behavioral/cs_fundamentals modes, examples are sample answers — clearly labeled "strong:" / "weak:".)
- "expectedComplexity" is the target the interviewer is hoping the candidate hits. Use "—" for modes where complexity doesn't apply.
- "starterHint" is ONE sentence — a vague nudge if they're stuck. Never reveals the algorithm.

Return STRICT JSON (no fences):
{
  "title": "string (max 80 chars, no boilerplate prefixes)",
  "statement": "markdown string",
  "constraints": "plain text",
  "examples": [
    { "input": "string", "output": "string", "explanation": "string" }
  ],
  "expectedComplexity": { "time": "O(...)", "space": "O(...)" },
  "starterHint": "one sentence"
}`;
}

export interface ApproachFeedbackResponse {
  onTrack: boolean;
  score: number; // 0-100
  observations: string[];
  questionsToConsider: string[];
  suggestedDirection: string;
  complexity: { time: string | null; space: string | null };
}

export function approachFeedbackPrompt(input: {
  problem: GeneratedProblem;
  transcript: string;
}): string {
  return `You are a senior interviewer evaluating a candidate's spoken approach (NOT their code yet — they haven't written any).

PROBLEM:
${input.problem.title}
${input.problem.statement}

CONSTRAINTS: ${input.problem.constraints}

CANDIDATE'S SPOKEN THOUGHT PROCESS (transcribed from voice):
${input.transcript}

EVALUATION RULES:
- Their wording may be messy from speech-to-text. Look for the IDEA, not surface phrasing.
- "onTrack": true if their approach (even if incomplete) is heading toward the expected complexity. False if they're going down a fundamentally wrong path.
- "score" 0-100: clarity + correctness + identifying complexity tradeoffs.
- "observations" (2-4): specific things they got right, vague gaps, or red flags. Don't praise generically.
- "questionsToConsider" (2-3): pointed questions a real interviewer would ask next, in second person ("Have you thought about...?").
- "suggestedDirection": ONE sentence nudge — not a solution, just where to look.
- "complexity": IF they explicitly mentioned a complexity, capture it. Otherwise both null.

NEVER reveal the full algorithm. NEVER say "the answer is X". You're a coach.

Return STRICT JSON (no fences):
{
  "onTrack": boolean,
  "score": number,
  "observations": ["string"],
  "questionsToConsider": ["string"],
  "suggestedDirection": "string",
  "complexity": { "time": "O(...)" | null, "space": "O(...)" | null }
}`;
}

export interface CodeEvaluationResponse {
  verdict: 'pass' | 'partial' | 'fail';
  score: number;
  complexity: { time: string; space: string };
  strengths: string[];
  weaknesses: string[];
  edgeCasesMissed: string[];
  lineByLine: Array<{ line: number; comment: string }>;
  summary: string;
}

export function codeEvaluationPrompt(input: {
  problem: GeneratedProblem;
  code: string;
  language: string;
}): string {
  return `You are a senior interviewer evaluating a candidate's submitted code at the END of an interview round.

PROBLEM:
${input.problem.title}
${input.problem.statement}

CONSTRAINTS: ${input.problem.constraints}
EXPECTED COMPLEXITY: time=${input.problem.expectedComplexity.time}, space=${input.problem.expectedComplexity.space}

CANDIDATE'S CODE (${input.language}):
\`\`\`${input.language}
${input.code}
\`\`\`

EVALUATION RULES:
- "verdict":
   - "pass" if it correctly solves the problem AND meets expected complexity
   - "partial" if it solves most cases but misses an edge case OR is one tier slower than expected
   - "fail" if it's fundamentally wrong, won't compile, or grossly inefficient
- "score" 0-100. Penalize for: wrong answer, bad complexity, missed edge cases, unclear naming, over-engineering.
- "complexity": YOUR analysis of their code (not the expected). If you can't tell, write "unknown".
- "strengths" (2-4): specific things done well. Cite real choices in their code.
- "weaknesses" (2-4): specific issues. Cite line numbers when relevant.
- "edgeCasesMissed" (0-4): inputs that would fail (empty, single, max, negative, duplicates, etc.). Be concrete.
- "lineByLine" (0-6): pinpoint specific lines worth calling out. Line numbers are 1-indexed against their code.
- "summary": 2-3 sentences a real interviewer would say aloud — direct, professional, neither cheery nor harsh.

Return STRICT JSON (no fences):
{
  "verdict": "pass" | "partial" | "fail",
  "score": number,
  "complexity": { "time": "O(...)", "space": "O(...)" },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "edgeCasesMissed": ["string"],
  "lineByLine": [{"line": number, "comment": "string"}],
  "summary": "string"
}`;
}

export function followUpPrompt(input: {
  problem: GeneratedProblem;
  code: string;
  language: string;
  conversation: Array<{ role: 'user' | 'interviewer'; text: string }>;
  userMessage: string;
}): string {
  const history = input.conversation
    .map((m) => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.text}`)
    .join('\n');
  return `You are continuing a mock technical interview. The candidate already submitted code, and you've been having a Q&A. Stay in character as the interviewer.

PROBLEM: ${input.problem.title}
${input.problem.statement}

CANDIDATE'S CODE (${input.language}):
\`\`\`${input.language}
${input.code}
\`\`\`

CONVERSATION SO FAR:
${history || '(none yet)'}

CANDIDATE JUST SAID:
${input.userMessage}

Reply as the interviewer would. Rules:
- Concise (under 100 words usually).
- If they ask about their code, give honest specific feedback referencing their actual code.
- If they ask "what would you do differently", suggest one concrete improvement.
- Feel free to ask a follow-up question pushing them deeper (scaling, alternative approaches, edge cases).
- Use markdown sparingly — just lists/bold/code as needed.
- Don't restart or re-evaluate from scratch. Build on the conversation.

Return plain markdown text (NOT JSON). Just your reply.`;
}
