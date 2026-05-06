// Smoke: opt out of mentor_replied, hit emit-test (which uses that type),
// verify NO notification push arrives. Then re-enable and verify push DOES arrive.
import WebSocket from 'ws';

const [, , TOKEN] = process.argv;
if (!TOKEN) {
  console.error('usage: node scripts/smoke-notif-prefs.mjs <accessToken>');
  process.exit(1);
}

const events = [];
const ws = new WebSocket(`ws://localhost:5000/notify?token=${encodeURIComponent(TOKEN)}`);
ws.on('message', (data) => {
  events.push(JSON.parse(data.toString('utf8')));
});

await new Promise((r) => setTimeout(r, 500));

async function patchPref(value) {
  const res = await fetch('http://localhost:5000/api/auth/me/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ notificationPrefs: { mentor_replied: value } }),
  });
  const body = await res.json();
  console.log(
    `patch mentor_replied=${value} → status=${res.status} prefs.notificationPrefs=${JSON.stringify(body.user?.preferences?.notificationPrefs)}`
  );
}

async function emitAndCount() {
  const before = events.length;
  const res = await fetch('http://localhost:5000/api/notifications/emit-test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  await new Promise((r) => setTimeout(r, 700));
  const newPushes = events.slice(before).filter((e) => e.type === 'notification:new');
  return { status: res.status, pushed: newPushes.length };
}

console.log('--- 1. disable mentor_replied ---');
await patchPref(false);
console.log('emit while DISABLED:', await emitAndCount());

console.log('--- 2. re-enable mentor_replied ---');
await patchPref(true);
console.log('emit while ENABLED:', await emitAndCount());

ws.close();
const phase1Skipped = events.filter((e) => e.type === 'notification:new').length === 1;
console.log('result:', phase1Skipped ? 'PASS' : 'FAIL');
process.exit(phase1Skipped ? 0 : 1);
