const baseInput = document.getElementById('baseUrl');
const tokenInput = document.getElementById('pairingToken');
const saveBtn = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.sync.get(['baseUrl', 'pairingToken'], (cfg) => {
  baseInput.value = cfg.baseUrl || 'http://localhost:5000';
  tokenInput.value = cfg.pairingToken || '';
});

saveBtn.addEventListener('click', () => {
  const baseUrl = baseInput.value.trim().replace(/\/$/, '');
  const pairingToken = tokenInput.value.trim();
  chrome.storage.sync.set({ baseUrl, pairingToken }, () => {
    status.className = 'ok';
    status.textContent = '✓ Saved.';
    setTimeout(() => (status.textContent = ''), 1500);
  });
});
