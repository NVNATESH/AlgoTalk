import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/roomService.js';

export const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  icon: z.string().max(8).optional(),
  initialContent: z.string().max(20_000).optional(),
  language: z.string().max(20).optional(),
});

export const create = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const room = await svc.createRoom(req.userId, req.body);
  res.status(201).json({ room });
});

export const listMine = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const rooms = await svc.listMyRooms(req.userId);
  res.json({ rooms });
});

export const get = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const room = await svc.getRoomById(req.userId, req.params.id);
  res.json({ room });
});

export const participants = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const out = await svc.getParticipants(req.userId, req.params.id);
  res.json(out);
});

export const joinByCodeSchema = z.object({ inviteCode: z.string().min(4).max(40) });
export const joinByCode = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const room = await svc.joinByInviteCode(req.userId, req.body.inviteCode);
  res.json({ room });
});

export const joinById = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const room = await svc.joinById(req.userId, req.params.id);
  res.json({ room });
});

export const leave = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.leaveRoom(req.userId, req.params.id);
  res.status(204).end();
});

export const grantSchema = z.object({ userId: z.string().min(1) });
export const grant = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const room = await svc.grantWriter(req.userId, req.params.id, req.body.userId);
  res.json({ room });
});

export const revoke = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const room = await svc.revokeWriter(req.userId, req.params.id, req.body.userId);
  res.json({ room });
});

export const remove = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  await svc.deleteRoom(req.userId, req.params.id);
  res.status(204).end();
});

export const listSnapshots = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const snapshots = await svc.listSnapshots(req.userId, req.params.id);
  res.json({ snapshots });
});
