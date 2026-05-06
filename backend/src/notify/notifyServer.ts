import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket as WS } from 'ws';

import { logger } from '../config/logger.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Per-user push channel for realtime notifications.
 *
 * One WS per browser tab. The user's account joins a `Map<userId, Set<conn>>`
 * room — when `pushToUser(userId, payload)` is called, all of that user's open
 * tabs receive the message. There's no fan-out beyond a single user; cross-user
 * broadcasts go through the Notification mongo collection + each recipient's
 * own emitNotification → pushToUser pair.
 *
 * Wire format (JSON over text frames):
 *   Server → Client: { type: 'notification:new', payload: <NotificationJSON> }
 *                  | { type: 'unread:count', count: number }
 *                  | { type: 'hello', userId: string }
 *
 * Frontend keeps the existing 30s poll as a fallback for when the WS is
 * disconnected (offline tab, transient blip, etc.) — the realtime path is
 * additive, not a replacement.
 */

interface NotifyConn extends WS {
  _userId?: string;
}

const userConns = new Map<string, Set<NotifyConn>>();

function send(conn: WS, msg: unknown) {
  if (conn.readyState !== conn.OPEN) return;
  try {
    conn.send(JSON.stringify(msg));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'notify ws send failed');
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

const wss = new WebSocketServer({ noServer: true });

function handleUpgrade(req: IncomingMessage, conn: NotifyConn) {
  const auth = authenticate(req);
  if (!auth) {
    conn.close(1008, 'Unauthorized');
    return;
  }
  conn._userId = auth.userId;
  let bucket = userConns.get(auth.userId);
  if (!bucket) {
    bucket = new Set();
    userConns.set(auth.userId, bucket);
  }
  bucket.add(conn);

  send(conn, { type: 'hello', userId: auth.userId });
  logger.debug({ userId: auth.userId, openTabs: bucket.size }, 'notify ws connected');

  conn.on('close', () => {
    const set = userConns.get(auth.userId);
    if (!set) return;
    set.delete(conn);
    if (set.size === 0) userConns.delete(auth.userId);
  });

  conn.on('error', (err) => {
    logger.warn({ err: err.message, userId: auth.userId }, 'notify ws error');
  });
}

export function attachNotifyServer(server: HttpServer) {
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://x');
    if (!url.pathname.startsWith('/notify')) return;
    wss.handleUpgrade(req, socket, head, (conn) => {
      handleUpgrade(req, conn as NotifyConn);
    });
  });
  logger.info('🔔 Notify WS server attached at /notify');
}

/**
 * Push a payload to every open WS tab for `userId`. Returns the number of tabs
 * that actually received it (0 means user is offline — that's fine, the
 * Notification row in Mongo + their next poll/page-load will catch them up).
 */
export function pushToUser(userId: string, msg: unknown): number {
  const set = userConns.get(userId);
  if (!set) return 0;
  let sent = 0;
  for (const conn of set) {
    if (conn.readyState === conn.OPEN) {
      send(conn, msg);
      sent++;
    }
  }
  return sent;
}

export function isUserOnline(userId: string): boolean {
  return (userConns.get(userId)?.size ?? 0) > 0;
}
