// Smoke test: verify Yjs server drops sync-update messages from readonly conns
// while still letting the asker's writes propagate to all peers.
import WebSocket from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const ROOM_ID = process.argv[2];
const ASKER_TOKEN = process.argv[3];
const PARTNER_TOKEN = process.argv[4];
if (!ROOM_ID || !ASKER_TOKEN || !PARTNER_TOKEN) {
  console.error('usage: node smoke-yjs-rbac.mjs <roomId> <askerToken> <partnerToken>');
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
      // Send our state vector (step1) so server replies with full state
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
        if (sub === 0 && encoding.length(enc) > 1) {
          // It was a step1 from server — reply with our step2
          ws.send(encoding.toUint8Array(enc));
        }
      }
    });

    ws.on('error', (e) => console.error(`[${label}] error:`, e.message));
    ws.on('close', (code, reason) =>
      console.log(`[${label}] closed code=${code} reason=${reason.toString()}`)
    );

    setTimeout(() => resolve({ ws, doc, yText, label }), 800);
  });
}

function sendUpdate(ws, doc, before) {
  const update = Y.encodeStateAsUpdate(doc, before);
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MESSAGE_SYNC);
  encoding.writeVarUint(enc, SYNC_UPDATE);
  encoding.writeVarUint8Array(enc, update);
  ws.send(encoding.toUint8Array(enc));
}

(async () => {
  const asker = await openConn('asker', ASKER_TOKEN);
  const partner = await openConn('partner', PARTNER_TOKEN);

  // 1. Asker writes — should propagate to partner.
  const beforeAsker = Y.encodeStateVector(asker.doc);
  asker.yText.insert(0, 'HELLO_FROM_ASKER\n');
  sendUpdate(asker.ws, asker.doc, beforeAsker);
  await new Promise((r) => setTimeout(r, 600));
  console.log(`asker.doc:   "${asker.yText.toString().replace(/\n/g, '\\n')}"`);
  console.log(`partner.doc: "${partner.yText.toString().replace(/\n/g, '\\n')}"`);
  const askerWritePropagated = partner.yText.toString().includes('HELLO_FROM_ASKER');
  console.log(`✓ asker write propagated to partner: ${askerWritePropagated}`);

  // 2. Partner (readonly) tries to write — should be DROPPED on server.
  const beforePartner = Y.encodeStateVector(partner.doc);
  partner.yText.insert(0, 'EVIL_FROM_READER\n');
  sendUpdate(partner.ws, partner.doc, beforePartner);
  await new Promise((r) => setTimeout(r, 600));
  console.log(`asker.doc:   "${asker.yText.toString().replace(/\n/g, '\\n')}"`);
  console.log(`partner.doc: "${partner.yText.toString().replace(/\n/g, '\\n')}"`);
  const evilLeaked = asker.yText.toString().includes('EVIL_FROM_READER');
  console.log(
    `✓ readonly write blocked on server (asker did NOT receive it): ${!evilLeaked}`
  );

  asker.ws.close();
  partner.ws.close();

  process.exit(askerWritePropagated && !evilLeaked ? 0 : 1);
})();
