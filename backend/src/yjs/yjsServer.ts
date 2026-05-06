import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket as WS } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

import { logger } from '../config/logger.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { Room, getRole, type RoleInRoom } from '../models/Room.js';
import { RoomSnapshot } from '../models/RoomSnapshot.js';

/**
 * Minimal Yjs WebSocket sync server, Express-attached.
 *
 * Wire protocol: msg type 0 = SYNC (sub 0/1/2), msg type 1 = AWARENESS.
 * One Y.Doc + Awareness per roomId.
 *
 * RBAC: server validates membership at upgrade time and inspects every SYNC
 * message — readonly connections may only send sync-step1 (a state-vector
 * query). Sync-step2 and update messages from readonly conns are dropped, so
 * a client that toggles Monaco's readOnly flag in DevTools still can't write.
 * Awareness is allowed for everyone so readers' cursors stay visible.
 */

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

const SYNC_STEP1 = 0;
const SYNC_STEP2 = 1;
const SYNC_UPDATE = 2;

interface Connection extends WS {
  _userId?: string;
  _roomId?: string;
  _role?: RoleInRoom;
}

interface RoomDoc {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<Connection, Set<number>>; // conn → set of clientIDs whose awareness it owns
  snapshotTimer?: NodeJS.Timeout | null;
  dirty?: boolean;            // any update since the last snapshot
  hydrated?: boolean;         // we've already loaded the latest persisted state
}

const docs = new Map<string, RoomDoc>();

// Capture every 30s while there's at least one connection. Spec: Module 1 §RBAC
// note "session recording (optional — stores Y.Doc snapshots every 30s)".
const SNAPSHOT_INTERVAL_MS = 30_000;
// Per-room cap on persisted snapshots — older rows pruned at write time. Keeps
// the collection bounded even on long-running rooms.
const SNAPSHOT_RETENTION = 20;

function getOrCreateDoc(roomId: string): RoomDoc {
  let entry = docs.get(roomId);
  if (entry) return entry;
  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);
  entry = { doc, awareness, conns: new Map(), snapshotTimer: null, dirty: false, hydrated: false };

  // Broadcast doc updates from anywhere (incl. server-applied) to all peers,
  // and mark the room dirty so the next snapshot tick persists it.
  doc.on('update', (update: Uint8Array, origin: any) => {
    entry!.dirty = true;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const buf = encoding.toUint8Array(encoder);
    for (const c of entry!.conns.keys()) {
      if (c !== origin) sendBuffer(c, buf);
    }
  });

  // Broadcast awareness changes
  awareness.on(
    'update',
    (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: any
    ) => {
      const changed = [...added, ...updated, ...removed];
      if (changed.length === 0) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changed)
      );
      const buf = encoding.toUint8Array(encoder);
      for (const c of entry!.conns.keys()) {
        if (c !== origin) sendBuffer(c, buf);
      }
    }
  );

  docs.set(roomId, entry);
  return entry;
}

/**
 * Apply the most recent persisted snapshot (if any) to a freshly-created
 * Y.Doc. Called once per room on first connect after eviction so the room
 * resumes where the last session left off. Snapshots are stored as the
 * output of `Y.encodeStateAsUpdate` so a single applyUpdate restores
 * everything.
 */
async function rehydrateFromSnapshot(roomId: string, room: RoomDoc): Promise<void> {
  if (room.hydrated) return;
  room.hydrated = true;
  try {
    const last = await RoomSnapshot.findOne({ roomId })
      .sort({ createdAt: -1 })
      .lean();
    if (!last || !last.state) return;
    Y.applyUpdate(room.doc, new Uint8Array(last.state as any), 'snapshot-restore');
    // The applyUpdate above flips `dirty` via the doc.update listener — clear
    // it so we don't immediately re-persist the same state we just loaded.
    room.dirty = false;
    logger.info(
      { roomId, bytes: last.bytes, age: Date.now() - new Date((last as any).createdAt).getTime() },
      'yjs: room rehydrated from snapshot'
    );
  } catch (err) {
    logger.warn({ err: (err as Error).message, roomId }, 'yjs: rehydrate failed (continuing fresh)');
  }
}

async function persistSnapshot(
  roomId: string,
  room: RoomDoc,
  reason: 'tick' | 'last-leaves' | 'manual'
): Promise<void> {
  if (!room.dirty && reason === 'tick') return;
  try {
    const update = Y.encodeStateAsUpdate(room.doc);
    if (update.byteLength === 0) return; // empty doc — nothing to record
    await RoomSnapshot.create({
      roomId,
      state: Buffer.from(update),
      bytes: update.byteLength,
      activeConns: room.conns.size,
      reason,
    });
    room.dirty = false;
    // Prune to the most recent SNAPSHOT_RETENTION rows.
    const docs = await RoomSnapshot.find({ roomId })
      .select('_id')
      .sort({ createdAt: -1 })
      .lean();
    if (docs.length > SNAPSHOT_RETENTION) {
      const toDelete = docs.slice(SNAPSHOT_RETENTION).map((d) => d._id);
      await RoomSnapshot.deleteMany({ _id: { $in: toDelete } });
    }
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, roomId, reason },
      'yjs: snapshot persist failed'
    );
  }
}

function startSnapshotTimer(roomId: string, room: RoomDoc) {
  if (room.snapshotTimer) return;
  room.snapshotTimer = setInterval(() => {
    void persistSnapshot(roomId, room, 'tick');
  }, SNAPSHOT_INTERVAL_MS);
}

function stopSnapshotTimer(room: RoomDoc) {
  if (room.snapshotTimer) {
    clearInterval(room.snapshotTimer);
    room.snapshotTimer = null;
  }
}

function sendBuffer(conn: WS, buf: Uint8Array) {
  if (conn.readyState !== conn.OPEN) return;
  try {
    conn.send(buf);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'ws send failed');
  }
}

function sendSyncStep1(conn: Connection, room: RoomDoc) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, room.doc);
  sendBuffer(conn, encoding.toUint8Array(encoder));

  // Also send current awareness state
  const states = room.awareness.getStates();
  if (states.size > 0) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys()))
    );
    sendBuffer(conn, encoding.toUint8Array(enc));
  }
}

function handleMessage(conn: Connection, room: RoomDoc, message: Uint8Array) {
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  if (messageType === MESSAGE_SYNC) {
    const subType = decoding.readVarUint(decoder);
    // Only writers (incl. asker) may push state (step2) or updates. Readonly
    // and kicked (null) conns may still send step1 to query state.
    const canWrite = conn._role === 'asker' || conn._role === 'writer';
    if (!canWrite && subType !== SYNC_STEP1) {
      logger.warn(
        { userId: conn._userId, roomId: conn._roomId, role: conn._role, subType },
        'yjs: blocked write attempt from non-writer conn'
      );
      return;
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    if (subType === SYNC_STEP1) {
      // Reply with our current state diff against the peer's vector.
      encoding.writeVarUint(encoder, SYNC_STEP2);
      syncProtocol.readSyncStep1(decoder, encoder, room.doc);
      sendBuffer(conn, encoding.toUint8Array(encoder));
    } else if (subType === SYNC_STEP2) {
      syncProtocol.readSyncStep2(decoder, room.doc, conn);
    } else if (subType === SYNC_UPDATE) {
      syncProtocol.readUpdate(decoder, room.doc, conn);
    } else {
      logger.warn({ subType, roomId: conn._roomId }, 'yjs: unknown sync sub-type');
    }
  } else if (messageType === MESSAGE_AWARENESS) {
    // Awareness (presence/cursors) allowed for all roles.
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(room.awareness, update, conn);
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
  if (parts.length < 2 || parts[0] !== 'yjs') return null;
  return parts[1];
}

const wss = new WebSocketServer({ noServer: true });

async function handleUpgrade(req: IncomingMessage, conn: Connection) {
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
  const role = getRole(roomRow, auth.userId);
  if (!role) {
    conn.close(1008, 'Not a member of this room');
    return;
  }

  conn._userId = auth.userId;
  conn._roomId = roomId;
  conn._role = role;
  conn.binaryType = 'arraybuffer';

  const room = getOrCreateDoc(roomId);
  // Restore from snapshot on first connect after eviction. Awaited here so
  // the SYNC_STEP1 we send below already includes restored state.
  if (!room.hydrated) await rehydrateFromSnapshot(roomId, room);
  room.conns.set(conn, new Set());
  // Begin periodic persistence as soon as someone's in the room.
  startSnapshotTimer(roomId, room);

  logger.info({ userId: auth.userId, roomId, role }, 'yjs ws connected');

  conn.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
    try {
      let bytes: Uint8Array;
      if (Array.isArray(data)) bytes = new Uint8Array(Buffer.concat(data));
      else if (data instanceof Buffer) bytes = new Uint8Array(data);
      else bytes = new Uint8Array(data);
      handleMessage(conn, room, bytes);
    } catch (err) {
      logger.warn({ err: (err as Error).message, roomId }, 'yjs handle message failed');
    }
  });

  conn.on('close', () => {
    const ownedClientIds = room.conns.get(conn);
    if (ownedClientIds && ownedClientIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        Array.from(ownedClientIds),
        null
      );
    }
    room.conns.delete(conn);
    logger.info({ userId: auth.userId, roomId, role }, 'yjs ws closed');
    // Clean up empty rooms after a short idle to avoid losing state too eagerly
    if (room.conns.size === 0) {
      // Capture the final state immediately so even a fast eviction has a
      // restorable record (the periodic timer might not have fired since the
      // last edit).
      void persistSnapshot(roomId, room, 'last-leaves');
      stopSnapshotTimer(room);
      setTimeout(() => {
        const r = docs.get(roomId);
        if (r && r.conns.size === 0) {
          r.doc.destroy();
          docs.delete(roomId);
          logger.debug({ roomId }, 'yjs room evicted');
        }
      }, 60_000);
    }
  });

  // Track which awareness clientIDs originate from this connection so we can
  // clean them up on disconnect.
  room.awareness.on('update', ({ added }: { added: number[] }, origin: any) => {
    if (origin === conn) {
      const set = room.conns.get(conn);
      if (set) for (const id of added) set.add(id);
    }
  });

  conn.on('error', (err) => {
    logger.warn({ err: err.message, roomId }, 'yjs ws error');
  });

  // Initial sync step 1 to the new peer
  sendSyncStep1(conn, room);
}

export function attachYjsServer(server: HttpServer) {
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://x');
    if (!url.pathname.startsWith('/yjs/')) return;
    wss.handleUpgrade(req, socket, head, (conn) => {
      void handleUpgrade(req, conn as Connection);
    });
  });
  logger.info('🔌 Yjs WS server attached at /yjs/:roomId');
}

/**
 * Update the cached role for any live conn(s) of `userId` in `roomId`.
 * Called by roomService on grant/revoke/leave so a mid-session demotion
 * takes effect immediately without forcing a reconnect.
 */
export function updateLiveRole(
  roomId: string,
  userId: string,
  newRole: RoleInRoom
): number {
  const room = docs.get(roomId);
  if (!room) return 0;
  let changed = 0;
  for (const conn of room.conns.keys()) {
    if (conn._userId === userId && conn._role !== newRole) {
      conn._role = newRole;
      changed++;
      // If the user was kicked from the room entirely, close their socket so
      // they can't keep observing state either.
      if (newRole === null) {
        try {
          conn.close(1008, 'Removed from room');
        } catch {
          /* noop */
        }
      }
    }
  }
  if (changed > 0) {
    logger.info({ roomId, userId, newRole, conns: changed }, 'yjs: live role updated');
  }
  return changed;
}
