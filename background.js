const DEFAULTS = {
  enabled: true,
  skippedCount: 0,
  lastSkippedAt: null
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(DEFAULTS, (current) => {
    if (chrome.runtime.lastError) return;
    chrome.storage.local.set({
      enabled: current.enabled !== false,
      skippedCount: Number.isFinite(current.skippedCount) ? current.skippedCount : 0,
      lastSkippedAt: current.lastSkippedAt || null
    });
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'AD_SKIPPED') {
    chrome.storage.local.get(DEFAULTS, (current) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false });
        return;
      }
      const skippedCount = (Number.isFinite(current.skippedCount) ? current.skippedCount : 0) + 1;
      chrome.storage.local.set({ skippedCount, lastSkippedAt: Date.now() }, () => {
        sendResponse({ ok: !chrome.runtime.lastError, skippedCount });
      });
    });
    return true;
  }

  if (message?.type === 'GET_STATE') {
    chrome.storage.local.get(DEFAULTS, (state) => {
      sendResponse({
        enabled: state.enabled !== false,
        skippedCount: Number.isFinite(state.skippedCount) ? state.skippedCount : 0,
        lastSkippedAt: state.lastSkippedAt || null
      });
    });
    return true;
  }

  if (message?.type === 'RESET_STATS') {
    chrome.storage.local.set({ skippedCount: 0, lastSkippedAt: null }, () => {
      sendResponse({ ok: !chrome.runtime.lastError });
    });
    return true;
  }

  return false;
});
