// Smoke test: two clients join /voice/:roomId, exchange a fake signal, verify
// the server forwards it to the right target only and announces peer-joined /
// peer-left correctly.
import WebSocket from 'ws';

const [, , ROOM_ID, ASKER_TOKEN, PARTNER_TOKEN] = process.argv;
if (!ROOM_ID || !ASKER_TOKEN || !PARTNER_TOKEN) {
  console.error('usage: node smoke-voice-signaling.mjs <roomId> <askerToken> <partnerToken>');
  process.exit(1);
}

function open(label, token) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:5000/voice/${ROOM_ID}?token=${token}`);
    const events = [];
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString('utf8'));
      events.push(msg);
      console.log(`[${label}] <-`, JSON.stringify(msg).slice(0, 160));
    });
    ws.on('error', (e) => console.error(`[${label}] error:`, e.message));
    ws.on('close', () => console.log(`[${label}] closed`));
    setTimeout(() => resolve({ ws, events, label }), 600);
  });
}

(async () => {
  console.log('--- asker connects first ---');
  const asker = await open('asker', ASKER_TOKEN);
  const askerHello = asker.events.find((e) => e.type === 'hello');
  console.log('asker hello peers:', askerHello?.peers?.length);

  console.log('--- partner connects, asker should see peer-joined ---');
  const partner = await open('partner', PARTNER_TOKEN);
  const partnerHello = partner.events.find((e) => e.type === 'hello');
  const askerSawJoin = asker.events.some((e) => e.type === 'peer-joined');
  console.log('partner hello peers:', partnerHello?.peers?.length);
  console.log('asker saw peer-joined:', askerSawJoin);

  console.log('--- partner sends a signal to asker ---');
  partner.ws.send(
    JSON.stringify({
      type: 'signal',
      target: askerHello.myConnId,
      payload: { kind: 'test', note: 'hello asker' },
    })
  );
  await new Promise((r) => setTimeout(r, 400));
  const askerGotSignal = asker.events.find(
    (e) => e.type === 'signal' && e.payload?.kind === 'test'
  );
  console.log('asker got signal:', !!askerGotSignal, '· from:', askerGotSignal?.from === partnerHello.myConnId);

  console.log('--- asker disconnects, partner should see peer-left ---');
  asker.ws.close();
  await new Promise((r) => setTimeout(r, 400));
  const partnerSawLeave = partner.events.some((e) => e.type === 'peer-left');
  console.log('partner saw peer-left:', partnerSawLeave);

  partner.ws.close();

  const ok =
    askerHello?.peers?.length === 0 &&
    partnerHello?.peers?.length === 1 &&
    askerSawJoin &&
    !!askerGotSignal &&
    askerGotSignal.from === partnerHello.myConnId &&
    partnerSawLeave;
  console.log('\nresult:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})();
