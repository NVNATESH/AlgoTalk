import crypto from 'node:crypto';
import { Types } from 'mongoose';
import type { Response } from 'express';
import { MentorConversation, conversationToJSON } from '../models/MentorConversation.js';
import { Goal } from '../models/Goal.js';
import { ApiError } from '../utils/ApiError.js';
import { mentorChatStream, type ChatHistoryMessage } from './gemini.js';
import { mentorSystemPrompt, type MentorContext } from '../prompts/learning.js';
import { logger } from '../config/logger.js';

const MAX_HISTORY = 20; // last N messages sent back to Gemini per turn
const MAX_PERSIST = 100; // hard cap on stored history per thread

async function loadGoal(userId: string, goalId: string) {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  const goal = await Goal.findOne({ _id: goalId, userId }).lean();
  if (!goal) throw ApiError.notFound('Goal not found');
  return goal;
}

function buildContext(goal: any, moduleId: string): MentorContext {
  const ctx: MentorContext = {
    goalName: goal.name,
    goalDifficulty: goal.difficulty,
  };
  const mod = (goal.modules ?? []).find((m: any) => m.moduleId === moduleId);
  if (mod) {
    ctx.currentModule = {
      title: mod.title,
      description: mod.description ?? '',
      topics: mod.topics ?? [],
      difficulty: mod.difficulty,
    };
  }
  // weak topics: modules where last quizScore < 60
  const weak = (goal.modules ?? [])
    .filter((m: any) => typeof m.quizScore === 'number' && m.quizScore < 60)
    .flatMap((m: any) => (m.topics ?? []) as string[]);
  if (weak.length) ctx.recentWeakTopics = Array.from(new Set<string>(weak)).slice(0, 5);
  return ctx;
}

export async function getOrCreateConversation(userId: string, goalId: string, moduleId = '') {
  if (!Types.ObjectId.isValid(goalId)) throw ApiError.notFound('Goal not found');
  // ensure goal exists and belongs to user
  await loadGoal(userId, goalId);
  let conv = await MentorConversation.findOne({ userId, goalId, moduleId });
  if (!conv) {
    conv = await MentorConversation.create({ userId, goalId, moduleId, messages: [] });
  }
  return conversationToJSON(conv.toObject());
}

export async function clearConversation(userId: string, goalId: string, moduleId = '') {
  await MentorConversation.findOneAndUpdate(
    { userId, goalId, moduleId },
    { $set: { messages: [], lastMessageAt: new Date() } },
    { upsert: false }
  );
}

interface StreamReplyArgs {
  userId: string;
  goalId: string;
  moduleId?: string;
  userMessage: string;
  res: Response;
  signal?: AbortSignal;
}

/**
 * Streams the assistant reply to the response as NDJSON lines:
 *   {"type":"start","userMessageId":"...","assistantMessageId":"..."}
 *   {"type":"delta","text":"..."}
 *   {"type":"done"}
 *   {"type":"error","message":"..."}
 *
 * Persists both user and assistant messages to the conversation when the stream completes.
 * If the client disconnects mid-stream, partial assistant text is still saved.
 */
export async function streamMentorReply({
  userId,
  goalId,
  moduleId = '',
  userMessage,
  res,
  signal,
}: StreamReplyArgs) {
  const trimmed = userMessage.trim();
  if (!trimmed) throw ApiError.badRequest('Message is empty');
  if (trimmed.length > 4000) throw ApiError.badRequest('Message too long (max 4000 chars)');

  const goal = await loadGoal(userId, goalId);
  const ctx = buildContext(goal, moduleId);
  const systemInstruction = mentorSystemPrompt(ctx);

  const conv = await MentorConversation.findOneAndUpdate(
    { userId, goalId, moduleId },
    { $setOnInsert: { messages: [] } },
    { upsert: true, new: true }
  );

  const userMsgId = `m_${crypto.randomBytes(8).toString('hex')}`;
  const assistantMsgId = `m_${crypto.randomBytes(8).toString('hex')}`;

  // history from store (last MAX_HISTORY before this turn)
  const history: ChatHistoryMessage[] = (conv!.messages as any[])
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, text: m.text }));

  // Set NDJSON streaming headers
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no'); // hint to disable proxy buffering
  res.flushHeaders?.();

  const writeLine = (obj: unknown) => {
    res.write(JSON.stringify(obj) + '\n');
  };

  writeLine({ type: 'start', userMessageId: userMsgId, assistantMessageId: assistantMsgId });

  let assistantText = '';
  let aborted = false;
  const onAbort = () => {
    aborted = true;
  };
  signal?.addEventListener('abort', onAbort);
  res.on('close', () => {
    aborted = true;
  });

  try {
    for await (const chunk of mentorChatStream(systemInstruction, history, trimmed)) {
      if (aborted) break;
      assistantText += chunk;
      writeLine({ type: 'delta', text: chunk });
    }
    if (!aborted) writeLine({ type: 'done' });
  } catch (err) {
    logger.error({ err, goalId, moduleId }, 'mentor stream failed');
    writeLine({ type: 'error', message: 'AI service error — try again' });
  } finally {
    signal?.removeEventListener('abort', onAbort);
    res.end();
  }

  // Persist whatever we got, even on partial/aborted stream
  try {
    const userMsg = {
      id: userMsgId,
      role: 'user' as const,
      text: trimmed,
      createdAt: new Date(),
    };
    const assistantMsg = assistantText.trim()
      ? {
          id: assistantMsgId,
          role: 'model' as const,
          text: assistantText,
          createdAt: new Date(),
        }
      : null;

    const update: any = {
      $push: {
        messages: {
          $each: assistantMsg ? [userMsg, assistantMsg] : [userMsg],
          $slice: -MAX_PERSIST,
        },
      },
      $set: { lastMessageAt: new Date() },
    };
    await MentorConversation.updateOne({ _id: conv!._id }, update);
  } catch (err) {
    logger.error({ err }, 'failed to persist mentor messages');
  }
}
