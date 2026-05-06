// Smoke test: a connected reader is promoted to writer mid-session — their
// updates should start propagating without a reconnect. Then revoke and verify
// they're blocked again.
import WebSocket from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const [, , ROOM_ID, ASKER_TOKEN, PARTNER_TOKEN, PARTNER_ID] = process.argv;
if (!ROOM_ID || !ASKER_TOKEN || !PARTNER_TOKEN || !PARTNER_ID) {
  console.error(
    'usage: node smoke-yjs-role-flip.mjs <roomId> <askerToken> <partnerToken> <partnerId>'
  );
  process.exit(1);
}

const MESSAGE_SYNC = 0;
const SYNC_STEP1 = 0;
const SYNC_UPDATE = 2;

function openConn(label, token) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:5000/yjs/${ROOM_ID}?token=${token}`);
    const doc = new Y.Doc();
    const yText = doc.getText('content');
    ws.on('open', () => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      encoding.writeVarUint(enc, SYNC_STEP1);
      encoding.writeVarUint8Array(enc, Y.encodeStateVector(doc));
      ws.send(encoding.toUint8Array(enc));
    });
    ws.on('message', (data) => {
      const buf = new Uint8Array(data);
      const dec = decoding.createDecoder(buf);
      const mType = decoding.readVarUint(dec);
      if (mType === MESSAGE_SYNC) {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MESSAGE_SYNC);
        const sub = syncProtocol.readSyncMessage(dec, enc, doc, ws);
        if (sub === 0 && encoding.length(enc) > 1) ws.send(encoding.toUint8Array(enc));
      }
    });
    setTimeout(() => resolve({ ws, doc, yText, label }), 800);
  });
}

function sendUpdate(ws, doc) {
  // Send full state — when prior updates were blocked the server's doc is
  // missing dependencies for incremental diffs, so just resend everything.
  const update = Y.encodeStateAsUpdate(doc);
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MESSAGE_SYNC);
  encoding.writeVarUint(enc, SYNC_UPDATE);
  encoding.writeVarUint8Array(enc, update);
  ws.send(encoding.toUint8Array(enc));
}

(async () => {
  const asker = await openConn('asker', ASKER_TOKEN);
  const partner = await openConn('partner', PARTNER_TOKEN);

  // PHASE 1: partner is readonly — write should be blocked
  const sv0 = Y.encodeStateVector(partner.doc);
  partner.yText.insert(0, 'phase1_blocked_');
  sendUpdate(partner.ws, partner.doc, sv0);
  await new Promise((r) => setTimeout(r, 600));
  const phase1Blocked = !asker.yText.toString().includes('phase1_blocked_');
  console.log(`phase 1 (readonly): write blocked = ${phase1Blocked}`);

  // PHASE 2: promote partner to writer via REST API
  const grantRes = await fetch(
    `http://localhost:5000/api/rooms/${ROOM_ID}/grant-write`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ASKER_TOKEN}`,
      },
      body: JSON.stringify({ userId: PARTNER_ID }),
    }
  );
  console.log(`grant status: ${grantRes.status}`);
  await new Promise((r) => setTimeout(r, 200));

  const sv1 = Y.encodeStateVector(partner.doc);
  partner.yText.insert(0, 'phase2_allowed_');
  sendUpdate(partner.ws, partner.doc, sv1);
  await new Promise((r) => setTimeout(r, 600));
  const phase2Allowed = asker.yText.toString().includes('phase2_allowed_');
  console.log(`phase 2 (promoted to writer): write propagated = ${phase2Allowed}`);

  // PHASE 3: revoke writer — write should be blocked again on the SAME conn
  const revokeRes = await fetch(
    `http://localhost:5000/api/rooms/${ROOM_ID}/revoke-write`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ASKER_TOKEN}`,
      },
      body: JSON.stringify({ userId: PARTNER_ID }),
    }
  );
  console.log(`revoke status: ${revokeRes.status}`);
  await new Promise((r) => setTimeout(r, 200));

  const askerStateBeforePhase3 = asker.yText.toString();
  const sv2 = Y.encodeStateVector(partner.doc);
  partner.yText.insert(0, 'phase3_blocked_');
  sendUpdate(partner.ws, partner.doc, sv2);
  await new Promise((r) => setTimeout(r, 600));
  const phase3Blocked =
    asker.yText.toString() === askerStateBeforePhase3 ||
    !asker.yText.toString().includes('phase3_blocked_');
  console.log(`phase 3 (revoked): write blocked = ${phase3Blocked}`);
  console.log('  asker.doc:', JSON.stringify(asker.yText.toString()));

  asker.ws.close();
  partner.ws.close();

  process.exit(phase1Blocked && phase2Allowed && phase3Blocked ? 0 : 1);
})();
