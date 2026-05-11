import { Types } from 'mongoose';
import {
  InterviewSession,
  sessionToJSON,
  sessionSummary,
  type InterviewDifficulty,
  type InterviewRole,
} from '../models/InterviewSession.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON, flashChatModel, proModel } from './gemini.js';
import {
  problemPrompt,
  approachFeedbackPrompt,
  codeEvaluationPrompt,
  followUpPrompt,
  type ApproachFeedbackResponse,
  type CodeEvaluationResponse,
  type GeneratedProblem,
  type InterviewMode,
} from '../prompts/interview.js';
import { logger } from '../config/logger.js';

interface StartInput {
  topic: string;
  topics?: string[];
  difficulty: InterviewDifficulty;
  role?: InterviewRole;
  notes?: string;
  mode?: InterviewMode;
  company?: string;
}

export async function startSession(userId: string, input: StartInput) {
  const role = input.role ?? 'Generic';
  // If `topics` is supplied, derive the canonical "topic" string from it so
  // the existing schema (single string) stays intact.
  const canonicalTopic =
    input.topics && input.topics.length > 0 ? input.topics.join(' + ') : input.topic;
  const problem = await geminiJSON<GeneratedProblem>(
    problemPrompt({
      topic: canonicalTopic,
      topics: input.topics,
      difficulty: input.difficulty,
      role,
      notes: input.notes,
      mode: input.mode,
      company: input.company,
    })
  );
  if (!problem?.title || !problem?.statement) {
    throw ApiError.badRequest('AI returned an invalid problem — try again');
  }

  const session = await InterviewSession.create({
    userId,
    topic: canonicalTopic.trim(),
    difficulty: input.difficulty,
    role,
    notes: (input.notes ?? '').trim(),
    problem: {
      title: problem.title,
      statement: problem.statement,
      constraints: problem.constraints ?? '',
      examples: problem.examples ?? [],
      expectedComplexity: problem.expectedComplexity ?? { time: '', space: '' },
      starterHint: problem.starterHint ?? '',
    },
    code: '',
    language: 'python',
    approachFeedbacks: [],
    evaluation: null,
    followUps: [],
    status: 'in_progress',
    startedAt: new Date(),
  });

  return sessionToJSON(session.toObject());
}

export async function listSessions(userId: string) {
  const docs = await InterviewSession.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return docs.map(sessionSummary);
}

async function loadSession(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Session not found');
  const session = await InterviewSession.findOne({ _id: id, userId });
  if (!session) throw ApiError.notFound('Session not found');
  return session;
}

export async function getSession(userId: string, id: string) {
  const session = await loadSession(userId, id);
  return sessionToJSON(session.toObject());
}

export async function saveCode(userId: string, id: string, code: string, language: string) {
  const session = await loadSession(userId, id);
  if (session.status !== 'in_progress') {
    throw ApiError.badRequest('Session is already submitted — cannot edit code');
  }
  session.code = code;
  session.language = language;
  await session.save();
  return sessionToJSON(session.toObject());
}

export async function submitApproach(userId: string, id: string, transcript: string) {
  const session = await loadSession(userId, id);
  if (session.status !== 'in_progress') {
    throw ApiError.badRequest('Cannot give approach feedback after submission');
  }
  const trimmed = transcript.trim();
  if (trimmed.length < 5) throw ApiError.badRequest('Transcript is too short');
  if (trimmed.length > 8000) throw ApiError.badRequest('Transcript is too long (max 8000 chars)');

  const feedback = await geminiJSON<ApproachFeedbackResponse>(
    approachFeedbackPrompt({ problem: session.problem as any, transcript: trimmed })
  );

  session.approachFeedbacks.push({
    transcript: trimmed,
    onTrack: !!feedback.onTrack,
    score: typeof feedback.score === 'number' ? feedback.score : 0,
    observations: feedback.observations ?? [],
    questionsToConsider: feedback.questionsToConsider ?? [],
    suggestedDirection: feedback.suggestedDirection ?? '',
    complexity: feedback.complexity ?? { time: null, space: null },
    createdAt: new Date(),
  } as any);
  await session.save();
  return sessionToJSON(session.toObject());
}

export async function submitCode(userId: string, id: string, code: string, language: string) {
  const session = await loadSession(userId, id);
  if (session.status === 'submitted' || session.status === 'completed') {
    throw ApiError.badRequest('Session already submitted');
  }
  const trimmed = code.trim();
  if (trimmed.length < 1) throw ApiError.badRequest('Code is empty');
  if (trimmed.length > 50_000) throw ApiError.badRequest('Code is too long');

  // Use flash — Pro hits free-tier 429 too quickly. Flash is plenty for code review.
  const evaluation = await geminiJSON<CodeEvaluationResponse>(
    codeEvaluationPrompt({ problem: session.problem as any, code: trimmed, language })
  );

  // Clamp line numbers to actual code length
  const codeLineCount = trimmed.split('\n').length;
  const lineByLine = (evaluation.lineByLine ?? [])
    .filter((l) => Number.isFinite(l.line))
    .map((l) => ({ line: Math.max(1, Math.min(codeLineCount, Math.round(l.line))), comment: l.comment }));

  session.code = trimmed;
  session.language = language;
  session.evaluation = {
    verdict: evaluation.verdict ?? 'fail',
    score: typeof evaluation.score === 'number' ? evaluation.score : 0,
    complexity: evaluation.complexity ?? { time: 'unknown', space: 'unknown' },
    strengths: evaluation.strengths ?? [],
    weaknesses: evaluation.weaknesses ?? [],
    edgeCasesMissed: evaluation.edgeCasesMissed ?? [],
    lineByLine,
    summary: evaluation.summary ?? '',
    createdAt: new Date(),
  } as any;
  session.status = 'submitted';
  session.submittedAt = new Date();
  if (session.startedAt) {
    session.durationSeconds = Math.round(
      (session.submittedAt.getTime() - new Date(session.startedAt).getTime()) / 1000
    );
  }
  await session.save();
  return sessionToJSON(session.toObject());
}

export async function followUp(userId: string, id: string, userMessage: string) {
  const session = await loadSession(userId, id);
  if (session.status !== 'submitted' && session.status !== 'completed') {
    throw ApiError.badRequest('Submit your code first to start the follow-up Q&A');
  }
  const trimmed = userMessage.trim();
  if (!trimmed) throw ApiError.badRequest('Empty message');
  if (trimmed.length > 2000) throw ApiError.badRequest('Message too long');

  const conversation = (session.followUps ?? []).map((m: any) => ({
    role: m.role as 'user' | 'interviewer',
    text: m.text,
  }));

  // Use plain text generation for the follow-up reply (not JSON)
  const model = flashChatModel();
  const promptText = followUpPrompt({
    problem: session.problem as any,
    code: session.code,
    language: session.language,
    conversation,
    userMessage: trimmed,
  });

  let replyText = '';
  try {
    const result = await model.generateContent(promptText);
    replyText = result.response.text().trim();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'follow-up gen failed');
    throw new ApiError(502, 'AI service unavailable — try again');
  }

  if (!replyText) replyText = '_(no reply)_';

  session.followUps.push(
    { role: 'user', text: trimmed, createdAt: new Date() } as any,
    { role: 'interviewer', text: replyText, createdAt: new Date() } as any
  );
  await session.save();

  return sessionToJSON(session.toObject());
}

export async function endSession(userId: string, id: string) {
  const session = await loadSession(userId, id);
  session.status = session.evaluation ? 'completed' : 'abandoned';
  await session.save();
  return sessionToJSON(session.toObject());
}

export async function deleteSession(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Session not found');
  const res = await InterviewSession.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0) throw ApiError.notFound('Session not found');
}
