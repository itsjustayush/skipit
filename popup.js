const enabledInput = document.querySelector('#enabled');
const skippedCount = document.querySelector('#skipped-count');
const lastSkipped = document.querySelector('#last-skipped');
const resetButton = document.querySelector('#reset');
const status = document.querySelector('#status');

const send = (message) => new Promise((resolve) => {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      resolve(null);
      return;
    }
    resolve(response);
  });
});

const formatLastSkipped = (timestamp) => {
  if (!timestamp) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(timestamp));
};

const render = (state) => {
  if (!state) return;
  enabledInput.checked = state.enabled !== false;
  skippedCount.textContent = String(state.skippedCount || 0);
  lastSkipped.textContent = formatLastSkipped(state.lastSkippedAt);
};

const refresh = async () => {
  render(await send({ type: 'GET_STATE' }));
};

enabledInput.addEventListener('change', async () => {
  await chrome.storage.local.set({ enabled: enabledInput.checked });
  status.textContent = enabledInput.checked ? 'Enabled' : 'Disabled';
  window.setTimeout(() => {
    status.textContent = '';
  }, 1200);
});

resetButton.addEventListener('click', async () => {
  const response = await send({ type: 'RESET_STATS' });
  if (response?.ok) {
    await refresh();
    status.textContent = 'Statistics reset';
  } else {
    status.textContent = 'Unable to reset statistics';
  }
});

refresh();
