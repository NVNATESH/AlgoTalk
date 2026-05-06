import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { Group, groupSummary } from '../models/Group.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const generateInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

export async function createGroup(
  userId: string,
  input: { name: string; description?: string; privacy: 'public' | 'private'; icon?: string }
) {
  // ensure unique invite code
  let code = generateInviteCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const existing = await Group.findOne({ inviteCode: code }).select('_id').lean();
    if (!existing) break;
    code = generateInviteCode();
  }

  const group = await Group.create({
    name: input.name.trim(),
    description: (input.description ?? '').trim(),
    privacy: input.privacy,
    icon: input.icon || '👥',
    admin: userId,
    inviteCode: code,
    members: [{ userId, role: 'admin', joinedAt: new Date() }],
  });
  return groupSummary(group.toObject(), userId);
}

export async function listMyGroups(userId: string) {
  const groups = await Group.find({ 'members.userId': userId }).sort({ updatedAt: -1 }).lean();
  return groups.map((g) => groupSummary(g, userId));
}

export async function listPublicGroups(viewerId?: string, opts: { search?: string } = {}) {
  const filter: Record<string, unknown> = { privacy: 'public' };
  if (opts.search) {
    filter.$or = [
      { name: { $regex: opts.search, $options: 'i' } },
      { description: { $regex: opts.search, $options: 'i' } },
    ];
  }
  const groups = await Group.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
  return groups.map((g) => groupSummary(g, viewerId));
}

export async function joinByInviteCode(userId: string, code: string) {
  const group = await Group.findOne({ inviteCode: code.toUpperCase().trim() });
  if (!group) throw ApiError.notFound('Invalid invite code');

  const already = group.members.some((m: any) => String(m.userId) === userId);
  if (already) {
    return groupSummary(group.toObject(), userId);
  }
  group.members.push({ userId: new Types.ObjectId(userId) as any, role: 'member', joinedAt: new Date() });
  await group.save();
  return groupSummary(group.toObject(), userId);
}

export async function joinPublicGroup(userId: string, groupId: string) {
  if (!Types.ObjectId.isValid(groupId)) throw ApiError.notFound('Group not found');
  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');
  if (group.privacy !== 'public') throw ApiError.forbidden('This group requires an invite code');

  const already = group.members.some((m: any) => String(m.userId) === userId);
  if (already) return groupSummary(group.toObject(), userId);

  group.members.push({ userId: new Types.ObjectId(userId) as any, role: 'member', joinedAt: new Date() });
  await group.save();
  return groupSummary(group.toObject(), userId);
}

export async function leaveGroup(userId: string, groupId: string) {
  if (!Types.ObjectId.isValid(groupId)) throw ApiError.notFound('Group not found');
  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');

  if (String(group.admin) === userId) {
    throw ApiError.badRequest(
      'Admins cannot leave their own group — delete it or transfer admin first'
    );
  }
  group.members = group.members.filter((m: any) => String(m.userId) !== userId) as any;
  await group.save();
}

export async function getGroupDetail(userId: string, groupId: string) {
  if (!Types.ObjectId.isValid(groupId)) throw ApiError.notFound('Group not found');
  const group = await Group.findById(groupId).lean();
  if (!group) throw ApiError.notFound('Group not found');

  const isMember = group.members.some((m: any) => String(m.userId) === userId);
  if (!isMember && group.privacy === 'private') {
    throw ApiError.forbidden('This group is private');
  }

  // Hydrate members with user info
  const memberIds = group.members.map((m: any) => m.userId);
  const users = await User.find({ _id: { $in: memberIds } })
    .select('username name profilePic xp level')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u] as const));

  const members = group.members.map((m: any) => {
    const u = userMap.get(String(m.userId));
    return {
      userId: String(m.userId),
      role: m.role,
      joinedAt: m.joinedAt,
      username: u?.username ?? '(unknown)',
      name: u?.name ?? '(unknown)',
      profilePic: u?.profilePic ?? '',
      xp: u?.xp ?? 0,
      level: u?.level ?? 'Beginner',
    };
  });

  return {
    ...groupSummary(group, userId),
    membersList: members,
  };
}

export async function removeMember(adminId: string, groupId: string, targetUserId: string) {
  if (!Types.ObjectId.isValid(groupId)) throw ApiError.notFound('Group not found');
  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');
  if (String(group.admin) !== adminId) throw ApiError.forbidden('Admin only');
  if (String(group.admin) === targetUserId) {
    throw ApiError.badRequest("Can't remove the group admin");
  }
  group.members = group.members.filter((m: any) => String(m.userId) !== targetUserId) as any;
  await group.save();
  return groupSummary(group.toObject(), adminId);
}

export async function deleteGroup(adminId: string, groupId: string) {
  if (!Types.ObjectId.isValid(groupId)) throw ApiError.notFound('Group not found');
  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');
  if (String(group.admin) !== adminId) throw ApiError.forbidden('Admin only');
  await Group.deleteOne({ _id: groupId });
}

// internal helper used by challenge routes
export async function assertMember(userId: string, groupId: string) {
  if (!Types.ObjectId.isValid(groupId)) throw ApiError.notFound('Group not found');
  const group = await Group.findById(groupId).select('members admin privacy').lean();
  if (!group) throw ApiError.notFound('Group not found');
  const isMember = group.members.some((m: any) => String(m.userId) === userId);
  if (!isMember) throw ApiError.forbidden('You must join the group first');
  return group;
}
