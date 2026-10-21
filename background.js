const DEFAULT_STATS = {
  today: null,
  todaySkipped: 0,
  totalSkipped: 0,
  acceleratedAds: 0,
  totalAcceleratedAds: 0
};

const todayKey = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const readState = (callback) => {
  chrome.storage.local.get({ enabled: true, stats: DEFAULT_STATS }, (state) => {
    if (chrome.runtime.lastError) {
      callback({ enabled: true, stats: { ...DEFAULT_STATS, today: todayKey() } });
      return;
    }
    const stats = { ...DEFAULT_STATS, ...(state.stats || {}) };
    const key = todayKey();
    if (stats.today !== key) {
      stats.today = key;
      stats.todaySkipped = 0;
      stats.acceleratedAds = 0;
    }
    callback({ enabled: state.enabled !== false, stats });
  });
};

const updateStats = (type, callback) => {
  readState(({ stats }) => {
    const nextStats = { ...stats };
    if (type === 'AD_SKIPPED') {
      nextStats.todaySkipped += 1;
      nextStats.totalSkipped += 1;
    }
    if (type === 'AD_ACCELERATED') {
      nextStats.acceleratedAds += 1;
      nextStats.totalAcceleratedAds += 1;
    }
    chrome.storage.local.set({ stats: nextStats }, () => callback(nextStats));
  });
};

chrome.runtime.onInstalled.addListener(() => {
  readState(({ enabled, stats }) => chrome.storage.local.set({ enabled, stats }));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AD_SKIPPED' || message?.type === 'AD_ACCELERATED') {
    updateStats(message.type, (stats) => {
      try {
        sendResponse({ ok: !chrome.runtime.lastError, stats });
      } catch (_e) {}
    });
    return true;
  }

  if (message?.type === 'AD_STARTED' || message?.type === 'AD_FINISHED') {
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === 'GET_STATE' || message?.type === 'GET_STATS') {
    readState((state) => {
      try {
        sendResponse(state);
      } catch (_e) {}
    });
    return true;
  }

  if (message?.type === 'TOGGLE_ENABLED') {
    const enabled = message.enabled !== false;
    chrome.storage.local.set({ enabled }, () => {
      try {
        sendResponse({ ok: !chrome.runtime.lastError, enabled });
      } catch (_e) {}
    });
    return true;
  }

  if (message?.type === 'RESET_STATS') {
    readState(({ enabled }) => {
      const stats = { ...DEFAULT_STATS, today: todayKey() };
      chrome.storage.local.set({ enabled, stats }, () => {
        try {
          sendResponse({ ok: !chrome.runtime.lastError, enabled, stats });
        } catch (_e) {}
      });
    });
    return true;
  }

  return false;
});
