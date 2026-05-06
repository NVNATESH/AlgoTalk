import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/interviewService.js';
import {
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_ROLES,
} from '../models/InterviewSession.js';

export const startSchema = z.object({
  topic: z.string().min(2).max(120),
  difficulty: z.enum(INTERVIEW_DIFFICULTIES),
  role: z.enum(INTERVIEW_ROLES).optional(),
  notes: z.string().max(500).optional(),
});

export const start = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.startSession(req.userId, req.body);
  res.status(201).json({ session });
});

export const list = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const sessions = await svc.listSessions(req.userId);
  res.json({ sessions });
});

export const get = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.getSession(req.userId, req.params.id);
  res.json({ session });
});

export const saveCodeSchema = z.object({
  code: z.string().max(50_000),
  language: z.string().min(1).max(20),
});

export const saveCode = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.saveCode(
    req.userId,
    req.params.id,
    req.body.code,
    req.body.language
  );
  res.json({ session });
});

export const approachSchema = z.object({
  transcript: z.string().min(5).max(8000),
});

export const approach = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.submitApproach(req.userId, req.params.id, req.body.transcript);
  res.json({ session });
});

export const submitSchema = z.object({
  code: z.string().min(1).max(50_000),
  language: z.string().min(1).max(20),
});

export const submit = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.submitCode(
    req.userId,
    req.params.id,
    req.body.code,
    req.body.language
  );
  res.json({ session });
});

export const followUpSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const followUp = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.followUp(req.userId, req.params.id, req.body.message);
  res.json({ session });
});

export const endSession = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const session = await svc.endSession(req.userId, req.params.id);
  res.json({ session });
});

export const remove = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.deleteSession(req.userId, req.params.id);
  res.status(204).end();
});
