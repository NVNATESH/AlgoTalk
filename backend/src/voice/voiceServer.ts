import crypto from 'node:crypto';
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket as WS } from 'ws';

import { logger } from '../config/logger.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { Room, getRole } from '../models/Room.js';
import { User } from '../models/User.js';

/**
 * Voice signaling WebSocket server.
 *
 * Provides a thin pass-through signaling layer for WebRTC peer mesh in collab
 * rooms. The server is OPAQUE to the SDP/ICE payloads — clients use raw
 * RTCPeerConnection on top, and we just route their `signal` envelopes to the
 * target peer in the same room.
 *
 * One connection per user-tab. A user only opens this WS when they click
 * "Join voice", so participants who don't want audio don't connect.
 *
 * Mesh size is capped at 4 to keep CPU + bandwidth manageable on a P2P fanout.
 *
 * Wire protocol (JSON over text frames):
 *   Client → Server:
 *     { type: 'signal', target: <connId>, payload: <opaque> }
 *
 *   Server → Client:
 *     { type: 'hello',  myConnId, peers: [{ connId, userId, name, username }] }
 *     { type: 'peer-joined', connId, userId, name, username }
 *     { type: 'peer-left',   connId }
 *     { type: 'signal', from: <connId>, payload: <opaque> }
 *     { type: 'room-full' }       — mesh cap reached, dropped before hello
 */

const MAX_MESH = 4;

interface VoiceConn extends WS {
  _connId?: string;
  _userId?: string;
  _roomId?: string;
  _name?: string;
  _username?: string;
}

interface VoiceRoom {
  conns: Map<string, VoiceConn>; // connId → conn
}

const rooms = new Map<string, VoiceRoom>();

function getOrCreateRoom(roomId: string): VoiceRoom {
  let r = rooms.get(roomId);
  if (!r) {
    r = { conns: new Map() };
    rooms.set(roomId, r);
  }
  return r;
}

function send(conn: WS, msg: unknown) {
  if (conn.readyState !== conn.OPEN) return;
  try {
    conn.send(JSON.stringify(msg));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'voice ws send failed');
  }
}

function authenticate(req: IncomingMessage): { userId: string } | null {
  try {
    const url = new URL(req.url ?? '', 'http://x');
    const token = url.searchParams.get('token');
    if (!token) return null;
    const payload = verifyAccessToken(token);
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

function parseRoomId(req: IncomingMessage): string | null {
  const url = new URL(req.url ?? '', 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== 'voice') return null;
  return parts[1];
}

const wss = new WebSocketServer({ noServer: true });

async function handleUpgrade(req: IncomingMessage, conn: VoiceConn) {
  const auth = authenticate(req);
  if (!auth) {
    conn.close(1008, 'Unauthorized');
    return;
  }
  const roomId = parseRoomId(req);
  if (!roomId) {
    conn.close(1008, 'Invalid room URL');
    return;
  }
  const roomRow = await Room.findById(roomId).lean().catch(() => null);
  if (!roomRow) {
    conn.close(1008, 'Room not found');
    return;
  }
  if (!getRole(roomRow, auth.userId)) {
    conn.close(1008, 'Not a member of this room');
    return;
  }
  const userRow = await User.findById(auth.userId).select('name username').lean();
  if (!userRow) {
    conn.close(1008, 'User not found');
    return;
  }

  const room = getOrCreateRoom(roomId);
  if (room.conns.size >= MAX_MESH) {
    send(conn, { type: 'room-full' });
    conn.close(1013, 'Voice mesh full');
    return;
  }

  const connId = crypto.randomBytes(8).toString('hex');
  conn._connId = connId;
  conn._userId = auth.userId;
  conn._roomId = roomId;
  conn._name = userRow.name;
  conn._username = userRow.username;

  // Announce existing peers to the new joiner
  const existing = Array.from(room.conns.values()).map((c) => ({
    connId: c._connId!,
    userId: c._userId!,
    name: c._name!,
    username: c._username!,
  }));
  send(conn, { type: 'hello', myConnId: connId, peers: existing });

  // Tell existing peers about the new joiner
  const announcement = {
    type: 'peer-joined' as const,
    connId,
    userId: auth.userId,
    name: userRow.name,
    username: userRow.username,
  };
  for (const c of room.conns.values()) send(c, announcement);

  room.conns.set(connId, conn);

  logger.info(
    { userId: auth.userId, roomId, connId, total: room.conns.size },
    'voice ws connected'
  );

  conn.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
    let text: string;
    if (Array.isArray(data)) text = Buffer.concat(data).toString('utf8');
    else if (data instanceof Buffer) text = data.toString('utf8');
    else text = Buffer.from(new Uint8Array(data)).toString('utf8');

    let msg: { type?: string; target?: string; payload?: unknown };
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (msg.type !== 'signal' || !msg.target) return;

    const target = room.conns.get(msg.target);
    if (!target) return;
    send(target, { type: 'signal', from: connId, payload: msg.payload });
  });

  conn.on('close', () => {
    if (!room.conns.delete(connId)) return;
    const farewell = { type: 'peer-left' as const, connId };
    for (const c of room.conns.values()) send(c, farewell);
    logger.info({ userId: auth.userId, roomId, connId }, 'voice ws closed');
    if (room.conns.size === 0) rooms.delete(roomId);
  });

  conn.on('error', (err) => {
    logger.warn({ err: err.message, roomId }, 'voice ws error');
  });
}

export function attachVoiceServer(server: HttpServer) {
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://x');
    if (!url.pathname.startsWith('/voice/')) return;
    wss.handleUpgrade(req, socket, head, (conn) => {
      void handleUpgrade(req, conn as VoiceConn);
    });
  });
  logger.info('🎙️ Voice signaling server attached at /voice/:roomId');
}
