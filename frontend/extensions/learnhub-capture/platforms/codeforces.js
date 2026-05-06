// Codeforces submission capture.
//
// CF shows verdicts in the "My submissions" table at the bottom of the
// submit page. We watch for the verdict cell to settle on a non-"In queue"
// /non-"Running" value, then forward to the background service worker.

(function () {
  const seen = new Set();

  function dispatch(row) {
    const td = row.querySelector('td.status-cell, td[class*="status"]');
    const verdictText = (td?.textContent || '').trim();
    if (
      !verdictText ||
      /in queue|running|testing/i.test(verdictText) ||
      seen.has(row)
    ) {
      return;
    }
    seen.add(row);

    // Pull out problem url + submission id from the row links if present.
    const problemLink = row.querySelector('a[href*="/problem/"]');
    const subLink = row.querySelector('a[href*="/submission/"]');
    const langCell = row.querySelector('td.lang-cell, td:nth-child(5)');
    const problemUrl = problemLink ? new URL(problemLink.href, location.origin).href : '';

    chrome.runtime.sendMessage({
      type: 'submissionDetected',
      payload: {
        platform: 'codeforces',
        problemUrl,
        verdict: verdictText.split(' ')[0], // "Accepted", "Wrong answer on test 3" → first token
        rawVerdict: verdictText,
        language: langCell?.textContent?.trim() ?? '',
        submissionUrl: subLink?.href ?? '',
        timestamp: Date.now(),
        location: location.href,
      },
    });
  }

  // CF's submission table lives at #pageContent .status-frame-datatable.
  function scan() {
    const rows = document.querySelectorAll(
      '.status-frame-datatable tr, .table tr.table-row'
    );
    rows.forEach((r) => {
      const txt = r.textContent || '';
      if (/Accepted|Wrong|Time limit|Memory|Runtime|Compilation/i.test(txt)) {
        dispatch(r);
      }
    });
  }

  scan();
  const obs = new MutationObserver(() => scan());
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
