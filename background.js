const DEFAULT_STATS = {
  today: null,
  todaySkipped: 0,
  totalSkipped: 0
};

const todayKey = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const readState = (callback) => {
  chrome.storage.local.get({
    enabled: true,
    stats: DEFAULT_STATS
  }, (state) => {
    if (chrome.runtime.lastError) {
      callback({ enabled: true, stats: { ...DEFAULT_STATS } });
      return;
    }

    const stats = {
      ...DEFAULT_STATS,
      ...(state.stats || {})
    };
    const key = todayKey();
    if (stats.today !== key) {
      stats.today = key;
      stats.todaySkipped = 0;
    }
    callback({
      enabled: state.enabled !== false,
      stats
    });
  });
};

chrome.runtime.onInstalled.addListener(() => {
  readState(({ enabled, stats }) => {
    chrome.storage.local.set({ enabled, stats });
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AD_SKIPPED') {
    readState(({ stats }) => {
      const nextStats = {
        ...stats,
        todaySkipped: stats.todaySkipped + 1,
        totalSkipped: stats.totalSkipped + 1
      };
      chrome.storage.local.set({ stats: nextStats }, () => {
        sendResponse({ ok: !chrome.runtime.lastError, stats: nextStats });
      });
    });
    return true;
  }

  if (message?.type === 'GET_STATE' || message?.type === 'GET_STATS') {
    readState((state) => sendResponse(state));
    return true;
  }

  if (message?.type === 'TOGGLE_ENABLED') {
    const enabled = message.enabled !== false;
    chrome.storage.local.set({ enabled }, () => {
      sendResponse({ ok: !chrome.runtime.lastError, enabled });
    });
    return true;
  }

  if (message?.type === 'RESET_STATS') {
    readState(({ enabled }) => {
      const stats = {
        ...DEFAULT_STATS,
        today: todayKey()
      };
      chrome.storage.local.set({ enabled, stats }, () => {
        sendResponse({ ok: !chrome.runtime.lastError, enabled, stats });
      });
    });
    return true;
  }

  return false;
});
