// AtCoder submission capture.
// Watches the "Submission Status" table for finalized verdicts.

(function () {
  const seen = new WeakSet();

  function dispatch(row) {
    if (seen.has(row)) return;
    const cells = row.querySelectorAll('td');
    if (cells.length < 7) return;
    const verdictCell = row.querySelector('td.text-center span, td.submission-status span');
    const verdict = (verdictCell?.textContent || '').trim();
    if (!verdict || /WJ|WR|judging/i.test(verdict)) return;
    seen.add(row);

    const problemLink = row.querySelector('a[href*="/tasks/"]');
    const langText = cells[3]?.textContent?.trim() ?? '';
    const subLink = row.querySelector('a[href*="/submissions/"]');

    chrome.runtime.sendMessage({
      type: 'submissionDetected',
      payload: {
        platform: 'atcoder',
        problemUrl: problemLink ? new URL(problemLink.href, location.origin).href : '',
        verdict, // "AC", "WA", "TLE", etc.
        rawVerdict: verdict,
        language: langText,
        submissionUrl: subLink?.href ?? '',
        timestamp: Date.now(),
        location: location.href,
      },
    });
  }

  function scan() {
    document
      .querySelectorAll('table.table-bordered tr, table.table tr')
      .forEach((r) => {
        const txt = r.textContent || '';
        if (/AC|WA|TLE|MLE|RE|CE|OLE|IE/i.test(txt)) dispatch(r);
      });
  }

  scan();
  new MutationObserver(scan).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
