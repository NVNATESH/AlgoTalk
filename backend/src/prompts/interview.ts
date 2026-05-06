export interface ProblemGenInput {
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  role: string;
  notes?: string;
}

export interface GeneratedProblem {
  title: string;
  statement: string; // markdown
  constraints: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  expectedComplexity: { time: string; space: string };
  starterHint: string;
}

export function problemPrompt(input: ProblemGenInput): string {
  return `You are an experienced technical interviewer. Generate ONE original interview problem.

CONTEXT:
- Topic: ${input.topic}
- Difficulty: ${input.difficulty}
- Role: ${input.role}
${input.notes ? `- User notes: ${input.notes}` : ''}

QUALITY RULES:
- Don't reuse famous LeetCode titles. Make it original but realistic for this role/difficulty.
- The problem must be solvable in under 30 minutes for the target role.
- The statement uses markdown (headings, lists, code if needed). Tone: clear, no fluff.
- "constraints" lists numeric bounds in plain text (e.g. "1 ≤ n ≤ 10^5").
- 2 examples with input/output and a one-sentence explanation.
- "expectedComplexity" is the target the interviewer is hoping the candidate hits.
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
