import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/groupService.js';
import * as cs from '../services/challengeService.js';
import * as ms from '../services/meetService.js';

export const createSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private']).default('public'),
  icon: z.string().max(8).optional(),
});

export const create = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const group = await svc.createGroup(req.userId, req.body);
  res.status(201).json({ group });
});

export const listMine = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const groups = await svc.listMyGroups(req.userId);
  res.json({ groups });
});

export const listPublic = asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const groups = await svc.listPublicGroups(req.userId, { search });
  res.json({ groups });
});

export const joinSchema = z.object({ inviteCode: z.string().min(4).max(20) });
export const joinByCode = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const group = await svc.joinByInviteCode(req.userId, req.body.inviteCode);
  res.json({ group });
});

export const joinPublicById = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const group = await svc.joinPublicGroup(req.userId, req.params.id);
  res.json({ group });
});

export const leave = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.leaveGroup(req.userId, req.params.id);
  res.status(204).end();
});

export const get = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const detail = await svc.getGroupDetail(req.userId, req.params.id);
  res.json({ group: detail });
});

export const removeMember = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const group = await svc.removeMember(req.userId, req.params.id, req.params.userId);
  res.json({ group });
});

export const remove = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.deleteGroup(req.userId, req.params.id);
  res.status(204).end();
});

// ----- Challenges -----

const externalPlatformEnum = z.enum([
  'leetcode',
  'codeforces',
  'codechef',
  'hackerrank',
  'gfg',
  'atcoder',
  'hackerearth',
  'custom',
]);
const difficultyEnum = z.enum(['Easy', 'Medium', 'Hard']);

export const postChallengeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('coding'),
    title: z.string().min(2).max(120),
    description: z.string().max(2000).optional(),
    points: z.number().int().min(1).max(1000).default(10),
    problemSlug: z.string().min(1).max(100).optional(),
    externalUrl: z.string().url().max(500).optional(),
    externalPlatform: externalPlatformEnum.optional(),
    difficulty: difficultyEnum.optional(),
    tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  }),
  z.object({
    type: z.literal('aptitude'),
    title: z.string().min(2).max(120),
    description: z.string().max(2000).optional(),
    points: z.number().int().min(1).max(1000).default(10),
    questionImageUrl: z.string().url().max(500).optional(),
    options: z.object({
      A: z.string().min(1).max(300),
      B: z.string().min(1).max(300),
      C: z.string().min(1).max(300),
      D: z.string().min(1).max(300),
    }),
    correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  }),
]);

export const postChallenge = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const challenge = await cs.postChallenge(req.userId, req.params.id, req.body);
  res.status(201).json({ challenge });
});

export const listChallenges = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const challenges = await cs.listChallenges(req.userId, req.params.id);
  res.json({ challenges });
});

export const respondSchema = z.object({
  selectedOption: z.enum(['A', 'B', 'C', 'D']),
});
export const respondAptitude = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const challenge = await cs.respondAptitude(
    req.userId,
    req.params.challengeId,
    req.body.selectedOption
  );
  res.json({ challenge });
});

export const getChallenge = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const challenge = await cs.getChallenge(req.userId, req.params.challengeId);
  res.json({ challenge });
});

export const deleteChallenge = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await cs.deleteChallenge(req.userId, req.params.challengeId);
  res.status(204).end();
});

export const verifyExternal = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const result = await cs.verifyExternalSolve(req.userId, req.params.challengeId);
  res.json(result);
});

export const leaderboard = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const rows = await cs.getLeaderboard(req.userId, req.params.id);
  res.json({ leaderboard: rows });
});

// ----- Meet System -----

export const requestMeetSchema = z.object({
  challengeId: z.string().min(1),
  preferredTime: z.string().datetime().optional(),
  message: z.string().max(500).optional(),
});

export const requestMeet = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const meet = await ms.createMeet(req.userId, req.params.id, req.body);
  res.status(201).json({ meet });
});

export const listMeets = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const meets = await ms.listGroupMeets(req.userId, req.params.id);
  res.json({ meets });
});

export const acceptMeet = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await ms.acceptMeet(req.userId, req.params.meetId);
  res.json(out);
});

export const cancelMeet = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const meet = await ms.cancelMeet(req.userId, req.params.meetId);
  res.json({ meet });
});
