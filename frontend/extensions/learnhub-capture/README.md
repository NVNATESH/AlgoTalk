# LearnHub Capture (Browser Extension)

A Manifest V3 browser extension that captures contest submissions in real
time across Codeforces, AtCoder, LeetCode, and CodeChef and forwards them to
your LearnHub backend's `/api/extension/submission-event` endpoint.

Without the extension, the platform pollers run every 60s; with it, your
verdicts land in your LearnHub dashboard within ~1 second of the platform
showing them.

## Install (developer mode)

1. Build / copy this folder somewhere stable.
2. Open `chrome://extensions` (or `edge://extensions`, `about:debugging` on Firefox).
3. Enable **Developer mode**.
4. Click **Load unpacked** → pick `frontend/extensions/learnhub-capture/`.
5. Click the puzzle-piece icon in the toolbar → pin **LearnHub Capture**.
6. Click the icon → enter your LearnHub URL (e.g. `http://localhost:5000`) and
   your **pairing token**.

### Generating a pairing token

The pairing token is a one-time secret your backend mints in Settings → Integrations
→ "Pair browser extension". (This UI ships with the next slice; for now, you can
mint a token by inserting a row in `extensionTokens` directly via Mongo:

```js
db.extensiontokens.insertOne({
  userId: ObjectId('<your-user-id>'),
  token: 'pick-something-long-and-random',
  createdAt: new Date(),
});
```

…and then setting that token in the extension popup.)

## Wire format

Content scripts dispatch:

```js
chrome.runtime.sendMessage({
  type: 'submissionDetected',
  payload: {
    platform: 'codeforces' | 'atcoder' | 'leetcode' | 'codechef',
    problemUrl: 'https://...',
    verdict: 'AC' | 'WA' | 'TLE' | ...,
    rawVerdict: 'Wrong answer on test 3',
    language: 'C++17',
    submissionUrl: 'https://.../submission/...',
    timestamp: Date.now(),
    location: location.href,
  },
});
```

The service worker dedupes within a 60s window (same platform + URL + verdict +
timestamp), then POSTs to `<baseUrl>/api/extension/submission-event` with
`X-LearnHub-Token` set to the pairing token.

## Per-platform notes

| Platform | Strategy | Caveats |
|---|---|---|
| **Codeforces** | DOM observe `.status-frame-datatable` rows | CF re-renders the table on tab visibility changes; observer handles it |
| **AtCoder** | DOM observe submission status spans | Verdicts settle from `WJ` → `WR/0` → `AC`; we dispatch only on terminal states |
| **LeetCode** | DOM observe result-card text | LC's selectors change frequently; we match by substring rather than exact class |
| **CodeChef** | DOM observe row icons (`tick-icon`, `cross-icon`, …) | Codechef sometimes serves a separate /viewsolution page rather than inline updates |

## Future work

- A first-class settings UI in Web LearnHub for minting + revoking pairing tokens
- Backend `POST /api/extension/submission-event` route that authenticates by
  `X-LearnHub-Token`, looks up the userId, and routes the event to the existing
  live-contest tracker's submission merge path
- HackerRank + HackerEarth + GFG content scripts (lower priority — those
  platforms' UIs are less standardized)
