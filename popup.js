const enabledToggle = document.querySelector('#enabled-toggle');
const todayValue = document.querySelector('#today');
const totalValue = document.querySelector('#total');
const resetButton = document.querySelector('#reset');
const status = document.querySelector('#status');

const send = (message) => new Promise((resolve) => {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      // Always read lastError inside the callback. This prevents the browser
      // from reporting an unchecked error when the worker is unavailable.
      const connectionError = chrome.runtime.lastError;
      if (connectionError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  } catch (_error) {
    resolve(null);
  }
});

const render = (state) => {
  if (!state) return;
  const stats = state.stats || {};
  enabledToggle.checked = state.enabled !== false;
  todayValue.textContent = String(stats.todaySkipped || 0);
  totalValue.textContent = String(stats.totalSkipped || 0);
};

const refresh = async () => {
  render(await send({ type: 'GET_STATE' }));
};

enabledToggle.addEventListener('change', async () => {
  const response = await send({ type: 'TOGGLE_ENABLED', enabled: enabledToggle.checked });
  status.textContent = response?.ok ? (enabledToggle.checked ? 'Enabled' : 'Disabled') : 'Unable to update setting';
  window.setTimeout(() => {
    status.textContent = '';
  }, 1200);
});

resetButton.addEventListener('click', async () => {
  const response = await send({ type: 'RESET_STATS' });
  if (response?.ok) {
    render(response);
    status.textContent = 'Statistics reset';
  } else {
    status.textContent = 'Unable to reset statistics';
  }
});

refresh();
