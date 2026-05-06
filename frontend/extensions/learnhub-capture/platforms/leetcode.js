// LeetCode submission capture.
// LC's submit panel renders verdicts inside a result card; we observe the
// submission status text for "Accepted" or a wrong-answer state.

(function () {
  let lastReported = '';

  function dispatch(verdict) {
    if (!verdict || verdict === lastReported) return;
    lastReported = verdict;
    chrome.runtime.sendMessage({
      type: 'submissionDetected',
      payload: {
        platform: 'leetcode',
        problemUrl: location.href.split('/submissions')[0],
        verdict,
        rawVerdict: verdict,
        language: detectLanguage(),
        submissionUrl: location.href,
        timestamp: Date.now(),
        location: location.href,
      },
    });
  }

  function detectLanguage() {
    const langPicker = document.querySelector('[data-cy="lang-select"], button[id*="headlessui-listbox-button"]');
    return langPicker?.textContent?.trim() ?? '';
  }

  function scan() {
    // Find a verdict-bearing element. LC changes its DOM frequently; we look for
    // common substrings rather than exact selectors.
    const candidates = document.querySelectorAll('[data-e2e-locator*="result"], div[class*="result"], div[class*="status"]');
    for (const el of candidates) {
      const txt = (el.textContent || '').trim();
      const m = txt.match(/(Accepted|Wrong Answer|Time Limit Exceeded|Memory Limit Exceeded|Runtime Error|Compile Error)/i);
      if (m) {
        dispatch(m[1]);
        return;
      }
    }
  }

  scan();
  new MutationObserver(scan).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
