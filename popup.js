const enabledToggle = document.querySelector('#enabled-toggle');
const todayValue = document.querySelector('#today');
const totalValue = document.querySelector('#total');
const acceleratedValue = document.querySelector('#accelerated');
const totalAcceleratedValue = document.querySelector('#total-accelerated');
const resetButton = document.querySelector('#reset');
const statusDot = document.querySelector('#status-dot');
const statusText = document.querySelector('#status-text');
const stateDescription = document.querySelector('#state-description');
const statusMsg = document.querySelector('#status');

let toastTimer = null;

const showToast = (text) => {
  if (toastTimer) window.clearTimeout(toastTimer);
  statusMsg.textContent = text;
  toastTimer = window.setTimeout(() => {
    statusMsg.textContent = '';
  }, 1400);
};

const send = (message) => new Promise((resolve) => {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      // Consuming lastError prevents unchecked runtime errors when worker is dormant
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
  const isEnabled = state.enabled !== false;
  const stats = state.stats || {};

  enabledToggle.checked = isEnabled;
  todayValue.textContent = String(stats.todaySkipped || 0);
  totalValue.textContent = String(stats.totalSkipped || 0);
  acceleratedValue.textContent = String(stats.acceleratedAds || 0);
  totalAcceleratedValue.textContent = String(stats.totalAcceleratedAds || 0);

  if (isEnabled) {
    statusDot.classList.remove('off');
    statusText.textContent = 'Active on YouTube';
    stateDescription.textContent = 'Auto-skips & fast-forwards ads at 16×';
  } else {
    statusDot.classList.add('off');
    statusText.textContent = 'Auto-skip is paused';
    stateDescription.textContent = 'Autopilot paused until turned back on';
  }
};

const refresh = async () => {
  render(await send({ type: 'GET_STATE' }));
};

enabledToggle.addEventListener('change', async () => {
  const isEnabled = enabledToggle.checked;
  const response = await send({ type: 'TOGGLE_ENABLED', enabled: isEnabled });
  if (response?.ok) {
    render({ enabled: isEnabled, stats: {
      todaySkipped: Number(todayValue.textContent) || 0,
      totalSkipped: Number(totalValue.textContent) || 0,
      acceleratedAds: Number(acceleratedValue.textContent) || 0,
      totalAcceleratedAds: Number(totalAcceleratedValue.textContent) || 0
    }});
    showToast(isEnabled ? 'Autopilot enabled' : 'Autopilot paused');
  } else {
    showToast('Failed to update setting');
  }
});

resetButton.addEventListener('click', async () => {
  const response = await send({ type: 'RESET_STATS' });
  if (response?.ok) {
    render(response);
    showToast('Statistics reset');
  } else {
    showToast('Unable to reset stats');
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    refresh();
  }
});

refresh();
