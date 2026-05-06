import crypto from 'node:crypto';
import { Types } from 'mongoose';
import {
  Room,
  roomToJSON,
  getRole,
  MAX_WRITERS,
  MAX_READ_ONLY,
} from '../models/Room.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { updateLiveRole } from '../yjs/yjsServer.js';
import { RoomSnapshot } from '../models/RoomSnapshot.js';

const generateInviteCode = () => crypto.randomBytes(5).toString('hex').toUpperCase();

export async function createRoom(
  userId: string,
  input: {
    name: string;
    description?: string;
    icon?: string;
    initialContent?: string;
    language?: string;
  }
) {
  // Make sure invite code is unique
  let code = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const existing = await Room.findOne({ inviteCode: code }).select('_id').lean();
    if (!existing) break;
    code = generateInviteCode();
  }

  const room = await Room.create({
    name: input.name.trim(),
    description: (input.description ?? '').trim(),
    icon: input.icon?.trim() || '🤝',
    asker: userId,
    writers: [userId], // asker is always a writer
    readOnly: [],
    inviteCode: code,
    initialContent: input.initialContent ?? '',
    language: input.language ?? 'javascript',
  });
  return roomToJSON(room.toObject(), userId);
}

export async function listMyRooms(userId: string) {
  const userObjId = new Types.ObjectId(userId);
  const rooms = await Room.find({
    $or: [
      { asker: userObjId },
      { writers: userObjId },
      { readOnly: userObjId },
    ],
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();
  return rooms.map((r) => roomToJSON(r, userId));
}

export async function getRoomById(userId: string, roomId: string) {
  if (!Types.ObjectId.isValid(roomId)) throw ApiError.notFound('Room not found');
  const room = await Room.findById(roomId).lean();
  if (!room) throw ApiError.notFound('Room not found');
  return roomToJSON(room, userId);
}

export async function getParticipants(userId: string, roomId: string) {
  if (!Types.ObjectId.isValid(roomId)) throw ApiError.notFound('Room not found');
  const room = await Room.findById(roomId).lean();
  if (!room) throw ApiError.notFound('Room not found');
  if (!getRole(room, userId)) throw ApiError.forbidden('Join the room first');

  const allIds = [
    ...(room.writers ?? []),
    ...(room.readOnly ?? []),
  ].map((id: any) => new Types.ObjectId(id));
  if (allIds.length === 0) return { participants: [], room: roomToJSON(room, userId) };

  const users = await User.find({ _id: { $in: allIds } })
    .select('username name profilePic level')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u] as const));

  const participants = [
    ...(room.writers ?? []).map((id: any) => {
      const u = userMap.get(String(id));
      return {
        userId: String(id),
        role: String(room.asker) === String(id) ? 'asker' : 'writer',
        username: u?.username ?? '(unknown)',
        name: u?.name ?? '(unknown)',
        profilePic: u?.profilePic ?? '',
        level: u?.level ?? 'Beginner',
      };
    }),
    ...(room.readOnly ?? []).map((id: any) => {
      const u = userMap.get(String(id));
      return {
        userId: String(id),
        role: 'readonly' as const,
        username: u?.username ?? '(unknown)',
        name: u?.name ?? '(unknown)',
        profilePic: u?.profilePic ?? '',
        level: u?.level ?? 'Beginner',
      };
    }),
  ];

  return { participants, room: roomToJSON(room, userId) };
}

export async function joinByInviteCode(userId: string, inviteCode: string) {
  const code = inviteCode.toUpperCase().trim();
  const room = await Room.findOne({ inviteCode: code });
  if (!room) throw ApiError.notFound('Invalid invite code');
  return joinInternal(userId, room);
}

export async function joinById(userId: string, roomId: string) {
  if (!Types.ObjectId.isValid(roomId)) throw ApiError.notFound('Room not found');
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  return joinInternal(userId, room);
}

async function joinInternal(userId: string, room: any) {
  const role = getRole(room.toObject ? room.toObject() : room, userId);
  if (role) {
    return roomToJSON(room.toObject ? room.toObject() : room, userId);
  }

  const total = (room.writers?.length ?? 0) + (room.readOnly?.length ?? 0);
  if (total >= MAX_WRITERS + MAX_READ_ONLY) {
    throw ApiError.forbidden('Room is full');
  }
  // New joins always go to readOnly. The asker can promote them to writer later.
  if ((room.readOnly?.length ?? 0) >= MAX_READ_ONLY) {
    throw ApiError.forbidden('Read-only slots are full');
  }
  room.readOnly.push(new Types.ObjectId(userId));
  await room.save();
  return roomToJSON(room.toObject(), userId);
}

export async function leaveRoom(userId: string, roomId: string) {
  if (!Types.ObjectId.isValid(roomId)) throw ApiError.notFound('Room not found');
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  if (String(room.asker) === userId) {
    throw ApiError.badRequest("Asker can't leave — delete the room instead");
  }
  room.writers = (room.writers ?? []).filter((w: any) => String(w) !== userId) as any;
  room.readOnly = (room.readOnly ?? []).filter((r: any) => String(r) !== userId) as any;
  await room.save();
  updateLiveRole(roomId, userId, null);
}

export async function grantWriter(askerId: string, roomId: string, targetUserId: string) {
  if (!Types.ObjectId.isValid(roomId)) throw ApiError.notFound('Room not found');
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  if (String(room.asker) !== askerId) throw ApiError.forbidden('Only the asker can grant write access');

  // Must be a current participant
  const role = getRole(room.toObject(), targetUserId);
  if (!role) throw ApiError.badRequest('Target user is not in this room');
  if (role === 'asker' || role === 'writer') {
    return roomToJSON(room.toObject(), askerId);
  }
  if ((room.writers?.length ?? 0) >= MAX_WRITERS) {
    throw ApiError.badRequest(
      `Writer slots are full (max ${MAX_WRITERS}). Revoke someone first.`
    );
  }
  // Move from readOnly → writers
  room.readOnly = (room.readOnly ?? []).filter((u: any) => String(u) !== targetUserId) as any;
  room.writers.push(new Types.ObjectId(targetUserId));
  await room.save();
  updateLiveRole(roomId, targetUserId, 'writer');
  return roomToJSON(room.toObject(), askerId);
}

export async function revokeWriter(askerId: string, roomId: string, targetUserId: string) {
  if (!Types.ObjectId.isValid(roomId)) throw ApiError.notFound('Room not found');
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  if (String(room.asker) !== askerId) throw ApiError.forbidden('Only the asker can revoke write access');
  if (String(room.asker) === targetUserId) {
    throw ApiError.badRequest("Can't revoke the asker's own write access");
  }
  // Move from writers → readOnly
  const wasWriter = (room.writers ?? []).some((w: any) => String(w) === targetUserId);
  if (!wasWriter) {
    return roomToJSON(room.toObject(), askerId);
  }
  room.writers = (room.writers ?? []).filter((w: any) => String(w) !== targetUserId) as any;
  if (!(room.readOnly ?? []).some((r: any) => String(r) === targetUserId)) {
    if ((room.readOnly?.length ?? 0) < MAX_READ_ONLY) {
      room.readOnly.push(new Types.ObjectId(targetUserId));
    }
  }
  await room.save();
  updateLiveRole(roomId, targetUserId, 'readonly');
  return roomToJSON(room.toObject(), askerId);
}

export async function deleteRoom(askerId: string, roomId: string) {
  if (!Types.ObjectId.isValid(roomId)) throw ApiError.notFound('Room not found');
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  if (String(room.asker) !== askerId) throw ApiError.forbidden('Only the asker can delete this room');
  await Room.deleteOne({ _id: roomId });
  // Drop the entire snapshot tape with the room — no orphan recordings.
  await RoomSnapshot.deleteMany({ roomId: new Types.ObjectId(roomId) });
}

/**
 * Snapshot history for a room — only members can read it. We deliberately do
 * not return the binary `state` blob; the list shows when each snapshot was
 * captured + how many bytes it weighs, which is enough for the session-history
 * UI on the room page.
 */
export async function listSnapshots(userId: string, roomId: string) {
  if (!Types.ObjectId.isValid(roomId)) throw ApiError.notFound('Room not found');
  const room = await Room.findById(roomId).lean();
  if (!room) throw ApiError.notFound('Room not found');
  if (!getRole(room, userId)) {
    throw ApiError.forbidden('Not a member of this room');
  }
  const rows = await RoomSnapshot.find({ roomId: new Types.ObjectId(roomId) })
    .select('-state')
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();
  return rows.map((r: any) => ({
    id: String(r._id),
    bytes: r.bytes,
    activeConns: r.activeConns,
    reason: r.reason,
    createdAt: r.createdAt,
  }));
}
