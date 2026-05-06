// LearnHub Capture — service worker.
//
// Receives `submissionDetected` events from content scripts, rate-limits +
// deduplicates, then POSTs to the user's LearnHub backend.

const DEFAULT_BASE_URL = 'http://localhost:5000';
const RECENT_CACHE_MS = 60_000; // dedupe window

const recentlySent = new Map(); // key -> ts

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['baseUrl', 'pairingToken'], (cfg) => {
      resolve({
        baseUrl: cfg.baseUrl || DEFAULT_BASE_URL,
        pairingToken: cfg.pairingToken || '',
      });
    });
  });
}

async function postEvent(payload) {
  const cfg = await getConfig();
  if (!cfg.pairingToken) {
    console.debug('[LearnHub] No pairing token configured — skipping post');
    return { skipped: true };
  }
  const url = `${cfg.baseUrl}/api/extension/submission-event`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LearnHub-Token': cfg.pairingToken,
      },
      body: JSON.stringify(payload),
    });
    return { status: res.status, ok: res.ok };
  } catch (err) {
    console.warn('[LearnHub] post failed', err);
    return { error: String(err) };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'submissionDetected') return;
  const event = msg.payload || {};
  const key = `${event.platform}:${event.problemUrl}:${event.verdict}:${event.timestamp}`;
  const now = Date.now();
  // Trim cache
  for (const [k, ts] of recentlySent) {
    if (now - ts > RECENT_CACHE_MS) recentlySent.delete(k);
  }
  if (recentlySent.has(key)) {
    sendResponse({ deduped: true });
    return true;
  }
  recentlySent.set(key, now);
  postEvent(event).then(sendResponse);
  return true; // async response
});
