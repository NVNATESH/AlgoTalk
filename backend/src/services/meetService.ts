import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { MeetRequest, meetToJSON } from '../models/MeetRequest.js';
import { GroupChallenge } from '../models/GroupChallenge.js';
import { Group } from '../models/Group.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { assertMember } from './groupService.js';
import { emitNotification, emitNotifications } from './notificationService.js';
import { logger } from '../config/logger.js';

const MEET_TTL_MS = 24 * 60 * 60 * 1000; // requests expire after 24h

interface CreateInput {
  challengeId: string;
  preferredTime?: string;
  message?: string;
}

export async function createMeet(userId: string, groupId: string, input: CreateInput) {
  await assertMember(userId, groupId);

  if (!Types.ObjectId.isValid(input.challengeId)) {
    throw ApiError.badRequest('Invalid challengeId');
  }
  const challenge = await GroupChallenge.findOne({
    _id: input.challengeId,
    groupId,
  }).lean();
  if (!challenge) throw ApiError.notFound('Challenge not found in this group');

  // One pending meet per (challenge, requester) at a time
  const existing = await MeetRequest.findOne({
    challengeId: challenge._id,
    requesterId: userId,
    status: 'pending',
  }).lean();
  if (existing) {
    throw ApiError.conflict(
      'You already have a pending meet request for this challenge — cancel it first or wait for someone to accept.'
    );
  }

  const preferredTime = input.preferredTime ? new Date(input.preferredTime) : null;
  if (preferredTime && Number.isNaN(preferredTime.getTime())) {
    throw ApiError.badRequest('Invalid preferredTime');
  }

  const meet = await MeetRequest.create({
    groupId,
    challengeId: challenge._id,
    requesterId: userId,
    preferredTime,
    message: (input.message ?? '').trim(),
    status: 'pending',
    expiresAt: new Date(Date.now() + MEET_TTL_MS),
  });

  // Notify all OTHER group members
  try {
    const group = await Group.findById(groupId).select('members name icon').lean();
    if (group) {
      const requester = await User.findById(userId).select('name').lean();
      const otherIds = (group.members ?? [])
        .map((m: any) => String(m.userId))
        .filter((id: string) => id !== userId);
      if (otherIds.length > 0) {
        void emitNotifications(otherIds, {
          type: 'challenge_resolved', // closest existing type — meet event variant
          title: `🤝 ${requester?.name ?? 'A member'} wants to pair on "${challenge.title}"`,
          message:
            (input.message?.trim() ? `"${input.message.trim()}" — ` : '') +
            `Open ${group.icon} ${group.name} to accept and start a workspace.`,
          icon: '🤝',
          link: `/groups/${groupId}`,
          priority: 'high',
          metadata: {
            groupId,
            challengeId: String(challenge._id),
            meetId: String(meet._id),
          },
        });
      }
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'meet-request fan-out failed');
  }

  return meetToJSON(meet.toObject());
}

export async function listGroupMeets(userId: string, groupId: string) {
  await assertMember(userId, groupId);
  const docs = await MeetRequest.find({ groupId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Lazy-expire: anything past expiresAt that's still pending becomes 'expired'
  const now = new Date();
  const expiredIds = docs
    .filter((d) => d.status === 'pending' && new Date(d.expiresAt) < now)
    .map((d) => d._id);
  if (expiredIds.length > 0) {
    await MeetRequest.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { status: 'expired' } }
    );
    for (const d of docs) {
      if (expiredIds.some((id) => String(id) === String(d._id))) {
        d.status = 'expired';
      }
    }
  }

  // Hydrate requester + acceptor + challenge title
  const userIds = new Set<string>();
  const challengeIds = new Set<string>();
  for (const d of docs) {
    userIds.add(String(d.requesterId));
    if (d.acceptedBy) userIds.add(String(d.acceptedBy));
    challengeIds.add(String(d.challengeId));
  }
  const [users, challenges] = await Promise.all([
    userIds.size
      ? User.find({ _id: { $in: Array.from(userIds).map((id) => new Types.ObjectId(id)) } })
          .select('username name profilePic')
          .lean()
      : Promise.resolve([]),
    challengeIds.size
      ? GroupChallenge.find({
          _id: { $in: Array.from(challengeIds).map((id) => new Types.ObjectId(id)) },
        })
          .select('title')
          .lean()
      : Promise.resolve([]),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u] as const));
  const challengeMap = new Map(challenges.map((c) => [String(c._id), c] as const));

  return docs.map((d: any) => {
    const r = userMap.get(String(d.requesterId));
    const a = d.acceptedBy ? userMap.get(String(d.acceptedBy)) : null;
    const c = challengeMap.get(String(d.challengeId));
    return meetToJSON({
      ...d,
      requester: r
        ? { userId: String(r._id), username: r.username, name: r.name, profilePic: r.profilePic ?? '' }
        : null,
      acceptor: a
        ? { userId: String(a._id), username: a.username, name: a.name, profilePic: a.profilePic ?? '' }
        : null,
      challengeTitle: c?.title ?? null,
    });
  });
}

export async function cancelMeet(userId: string, meetId: string) {
  if (!Types.ObjectId.isValid(meetId)) throw ApiError.notFound('Meet not found');
  const meet = await MeetRequest.findById(meetId);
  if (!meet) throw ApiError.notFound('Meet not found');
  if (String(meet.requesterId) !== userId) {
    throw ApiError.forbidden('Only the requester can cancel');
  }
  if (meet.status !== 'pending') {
    throw ApiError.badRequest(`Meet is already ${meet.status}`);
  }
  meet.status = 'cancelled';
  meet.cancelledAt = new Date();
  await meet.save();
  return meetToJSON(meet.toObject());
}

export async function acceptMeet(userId: string, meetId: string, scheduledTime?: string) {
  if (!Types.ObjectId.isValid(meetId)) throw ApiError.notFound('Meet not found');
  const meet = await MeetRequest.findById(meetId);
  if (!meet) throw ApiError.notFound('Meet not found');
  if (meet.status !== 'pending') {
    throw ApiError.badRequest(`Meet is already ${meet.status}`);
  }

  // Parse and validate scheduled time
  let meetTime: Date | null = null;
  if (scheduledTime) {
    meetTime = new Date(scheduledTime);
    if (Number.isNaN(meetTime.getTime())) {
      throw ApiError.badRequest('Invalid scheduledTime');
    }
    if (meetTime.getTime() < Date.now() - 60_000) {
      throw ApiError.badRequest('Scheduled time cannot be in the past');
    }
  }
  if (new Date(meet.expiresAt) < new Date()) {
    meet.status = 'expired';
    await meet.save();
    throw ApiError.badRequest('This meet request has expired');
  }
  if (String(meet.requesterId) === userId) {
    throw ApiError.badRequest("You can't accept your own meet request");
  }

  // Must be a member of the same group
  await assertMember(userId, String(meet.groupId));

  // Enforce: at most ONE active room per group. If another meeting is already
  // live, surface the existing roomId so the UI can redirect there instead of
  // double-creating.
  const existingActive = await Room.findOne({
    groupId: meet.groupId,
    endedAt: null,
  })
    .select('_id')
    .lean();
  if (existingActive) {
    throw ApiError.conflict(
      `A meeting is already active in this group. Join the existing room instead. roomId=${String(
        existingActive._id
      )}`
    );
  }

  // Pull challenge details for room initial content
  const challenge = await GroupChallenge.findById(meet.challengeId).lean();
  if (!challenge) throw ApiError.notFound('Original challenge no longer exists');

  // Build initial whiteboard content
  const initialContent = challengeToStarterContent(challenge);

  // Create the room with both users — requester is the asker, acceptor joins as writer
  const inviteCode = crypto.randomBytes(5).toString('hex').toUpperCase();
  const room = await Room.create({
    name: `Meet: ${challenge.title}`.slice(0, 80),
    description: `Live workspace for the "${challenge.title}" group challenge.`,
    icon: '🤝',
    asker: meet.requesterId,
    writers: [meet.requesterId, new Types.ObjectId(userId)],
    readOnly: [],
    inviteCode,
    initialContent,
    language: pickLanguageForChallenge(challenge),
    groupId: meet.groupId,
  });

  meet.status = 'accepted';
  meet.acceptedBy = new Types.ObjectId(userId) as any;
  meet.acceptedAt = new Date();
  meet.roomId = room._id as any;
  if (meetTime) (meet as any).scheduledTime = meetTime;
  await meet.save();

  // Notify requester that their meet was accepted
  try {
    const acceptor = await User.findById(userId).select('name').lean();
    void emitNotification({
      userId: String(meet.requesterId),
      type: 'challenge_resolved',
      title: `🎉 ${acceptor?.name ?? 'Someone'} accepted your meet`,
      message: `Workspace ready for "${challenge.title}" — jump in.`,
      icon: '🤝',
      link: `/rooms/${room._id}`,
      priority: 'high',
      metadata: {
        groupId: String(meet.groupId),
        challengeId: String(meet.challengeId),
        meetId: String(meet._id),
        roomId: String(room._id),
      },
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'meet-accepted notify failed');
  }

  return {
    meet: meetToJSON(meet.toObject()),
    roomId: String(room._id),
  };
}

/**
 * Returns the currently-active meeting/room for a group (if any), plus a flag
 * for whether a new one can be started. Used by the group detail page's
 * pinned-meeting banner.
 */
export async function getActiveGroupMeeting(userId: string, groupId: string) {
  await assertMember(userId, groupId);
  const room = await Room.findOne({
    groupId: new Types.ObjectId(groupId),
    endedAt: null,
  }).lean();
  if (!room) return { active: null as null | any, canStart: true };

  // Hydrate participants for the active-room banner
  const userIds = [...(room.writers ?? []), ...(room.readOnly ?? [])].map(
    (id: any) => new Types.ObjectId(id)
  );
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select('username name profilePic').lean()
    : [];
  return {
    active: {
      roomId: String(room._id),
      name: room.name,
      icon: room.icon,
      asker: String(room.asker),
      writers: (room.writers ?? []).map((u: any) => String(u)),
      readOnly: (room.readOnly ?? []).map((u: any) => String(u)),
      participantCount: (room.writers?.length ?? 0) + (room.readOnly?.length ?? 0),
      participants: users.map((u: any) => ({
        userId: String(u._id),
        username: u.username,
        name: u.name,
        profilePic: u.profilePic ?? '',
      })),
      createdAt: (room as any).createdAt,
    },
    canStart: false,
  };
}

/**
 * Ends the currently active group meeting. Anyone in the room can end it; if
 * there is no active room we no-op (idempotent). The Yjs/voice sockets stay up
 * until everyone disconnects — `endedAt` just unlocks the group for a new meet.
 */
export async function endActiveGroupMeeting(userId: string, groupId: string) {
  await assertMember(userId, groupId);
  const room = await Room.findOne({
    groupId: new Types.ObjectId(groupId),
    endedAt: null,
  });
  if (!room) return { ended: false };
  const isParticipant =
    String(room.asker) === userId ||
    (room.writers ?? []).some((w: any) => String(w) === userId) ||
    (room.readOnly ?? []).some((r: any) => String(r) === userId);
  if (!isParticipant) {
    // Group admins can also end stale meetings
    const group = await Group.findById(groupId).select('admin').lean();
    if (!group || String(group.admin) !== userId) {
      throw ApiError.forbidden('Only a participant or group admin can end this meeting');
    }
  }
  room.endedAt = new Date();
  await room.save();
  return { ended: true, roomId: String(room._id) };
}

function challengeToStarterContent(challenge: any): string {
  const lines: string[] = [];
  lines.push(`// 🤝 Pair session: ${challenge.title}`);
  if (challenge.description) {
    lines.push(`//`);
    challenge.description.split('\n').forEach((l: string) => lines.push(`// ${l}`));
  }
  if (challenge.problemSlug) {
    lines.push(`//`);
    lines.push(`// LearnHub problem: /solve/${challenge.problemSlug}`);
  } else if (challenge.externalUrl) {
    lines.push(`//`);
    lines.push(`// External link: ${challenge.externalUrl}`);
  }
  lines.push(`//`);
  lines.push(`// You both have write access. Solve together, talk through it, take turns.`);
  lines.push('');
  return lines.join('\n');
}

function pickLanguageForChallenge(challenge: any): string {
  // For internal coding problems, default to javascript so MonacoBinding has highlighting.
  // External or aptitude → plaintext (no good default).
  if (challenge.type === 'coding' && challenge.problemSlug) return 'javascript';
  return 'plaintext';
}
