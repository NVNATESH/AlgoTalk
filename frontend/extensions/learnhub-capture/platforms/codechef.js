// CodeChef submission capture.
// CC renders verdicts in the submission row's status icon + tooltip; we
// match against the icon class fragments their site uses.

(function () {
  const seen = new WeakSet();

  const STATUS_BY_FRAG = [
    [/tick-icon/i, 'AC'],
    [/cross-icon|alert-icon/i, 'WA'],
    [/clock_error/i, 'TLE'],
    [/memory_error/i, 'MLE'],
    [/runtime_error/i, 'RE'],
    [/compile_error/i, 'CE'],
  ];

  function dispatch(row) {
    if (seen.has(row)) return;
    const html = row.innerHTML;
    let verdict = '';
    for (const [re, v] of STATUS_BY_FRAG) {
      if (re.test(html)) {
        verdict = v;
        break;
      }
    }
    if (!verdict) return;
    seen.add(row);

    const problemLink = row.querySelector('a[href*="/problems/"]');
    chrome.runtime.sendMessage({
      type: 'submissionDetected',
      payload: {
        platform: 'codechef',
        problemUrl: problemLink ? new URL(problemLink.href, location.origin).href : '',
        verdict,
        rawVerdict: verdict,
        language: '',
        submissionUrl: '',
        timestamp: Date.now(),
        location: location.href,
      },
    });
  }

  function scan() {
    document
      .querySelectorAll('table tr, .status-table tr')
      .forEach((r) => {
        const html = r.innerHTML;
        if (/tick-icon|cross-icon|alert-icon|clock_error|memory_error|runtime_error|compile_error/i.test(html)) {
          dispatch(r);
        }
      });
  }

  scan();
  new MutationObserver(scan).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
