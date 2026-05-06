import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as svc from '../services/profileService.js';

export const getByUsername = asyncHandler(async (req, res) => {
  const data = await svc.getProfileByUsername(req.params.username, req.userId);
  res.json(data);
});

export const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(120).optional(),
  education: z.string().max(160).optional(),
  profilePic: z.string().max(500).optional(),
  socialLinks: z
    .object({
      github: z.string().max(160).optional(),
      linkedin: z.string().max(160).optional(),
      twitter: z.string().max(160).optional(),
    })
    .optional(),
  skills: z.array(z.string().min(1).max(40)).max(30).optional(),
});

export const updateMe = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const updated = await svc.updateProfile(req.userId, req.body);
  res.json({
    user: {
      id: String((updated as any)._id),
      name: updated.name,
      username: updated.username,
      email: updated.email,
      bio: updated.bio,
      location: updated.location,
      education: updated.education,
      socialLinks: updated.socialLinks,
      skills: updated.skills,
      profilePic: updated.profilePic,
      level: updated.level,
      xp: updated.xp,
      isVerified: updated.isVerified,
      role: updated.role,
      preferences: updated.preferences,
      createdAt: (updated as any).createdAt,
    },
  });
});

export const follow = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const result = await svc.followUser(req.userId, req.params.username);
  res.json(result);
});

export const unfollow = asyncHandler(async (req, res) => {
  if (!req.userId) throw ApiError.unauthorized();
  const result = await svc.unfollowUser(req.userId, req.params.username);
  res.json(result);
});

export const listFollowers = asyncHandler(async (req, res) => {
  const list = await svc.listFollowEdge(req.params.username, 'followers');
  res.json({ users: list });
});

export const listFollowing = asyncHandler(async (req, res) => {
  const list = await svc.listFollowEdge(req.params.username, 'following');
  res.json({ users: list });
});
