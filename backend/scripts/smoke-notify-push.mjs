// Smoke test: connect to /notify, hit /notifications/emit-test, verify the WS
// receives the push within 2 seconds. Requires sai_test to be admin (the
// emit-test endpoint is admin-only).
import WebSocket from 'ws';

const [, , TOKEN] = process.argv;
if (!TOKEN) {
  console.error('usage: node scripts/smoke-notify-push.mjs <accessToken>');
  process.exit(1);
}

const events = [];
const ws = new WebSocket(`ws://localhost:5000/notify?token=${encodeURIComponent(TOKEN)}`);

ws.on('open', () => console.log('[ws] open'));
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString('utf8'));
  events.push(msg);
  console.log('[ws] <-', JSON.stringify(msg).slice(0, 200));
});
ws.on('close', (code) => console.log('[ws] close', code));
ws.on('error', (e) => console.error('[ws] error', e.message));

// Wait for hello.
await new Promise((r) => setTimeout(r, 700));
const helloOk = events.some((e) => e.type === 'hello');
console.log('hello received:', helloOk);

// Trigger a push.
const res = await fetch('http://localhost:5000/api/notifications/emit-test', {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}` },
});
console.log('emit-test status:', res.status);

// Wait a beat for the push to arrive.
await new Promise((r) => setTimeout(r, 800));
const pushOk = events.some(
  (e) => e.type === 'notification:new' && e.payload?.title?.includes('Test notification')
);
console.log('push received:', pushOk);

ws.close();
const ok = helloOk && res.ok && pushOk;
console.log('result:', ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
