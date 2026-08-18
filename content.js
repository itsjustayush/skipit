(() => {
  'use strict';

  const CONFIG = Object.freeze({
    debounceMs: 40,
    fallbackIntervalMs: 750,
    clickCooldownMs: 250,
    debug: false
  });

  const SKIP_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.videoAdUiSkipButton',
    'button[aria-label*="Skip ad" i]',
    '[role="button"][aria-label*="Skip ad" i]',
    'button[data-tooltip*="Skip" i]',
    '[role="button"][data-tooltip*="Skip" i]'
  ];

  const CLOSE_SELECTORS = [
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-overlay-close-container button',
    'button.ytp-ad-overlay-close-button-modern',
    '.ytp-ad-overlay-close-icon-modern'
  ];

  const PLAYER_SELECTORS = [
    '#movie_player',
    '.html5-video-player',
    'ytd-player',
    'ytd-watch-flexy #player'
  ];

  let enabled = true;
  let observer = null;
  let debounceTimer = null;
  let lastScanAt = 0;
  let lastActionAt = 0;
  let scanCount = 0;
  const actedOn = new WeakSet();

  const log = (...args) => {
    if (CONFIG.debug) {
      console.debug('[SkipIt]', ...args);
    }
  };

  const getStoredEnabled = (callback) => {
    try {
      chrome.storage.local.get({ enabled: true }, (result) => {
        if (chrome.runtime.lastError) {
          callback(true);
          return;
        }
        callback(result.enabled !== false);
      });
    } catch (_error) {
      callback(true);
    }
  };

  const isVisibleAndInteractive = (element) => {
    if (!(element instanceof HTMLElement) || !element.isConnected) return false;
    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (Number.parseFloat(style.opacity || '1') <= 0 || style.pointerEvents === 'none') return false;

    let parent = element.parentElement;
    while (parent) {
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') return false;
      parent = parent.parentElement;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) return false;
    return true;
  };

  const getSearchRoots = () => {
    const roots = PLAYER_SELECTORS
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element, index, all) => all.indexOf(element) === index);

    return roots.length > 0 ? roots : [document];
  };

  const isInPlayer = (element, roots) => roots.some((root) => root === document || root.contains(element));

  const findCandidates = (selectors, roots) => {
    const found = [];
    const seen = new Set();

    for (const root of roots) {
      for (const selector of selectors) {
        let elements;
        try {
          elements = root.querySelectorAll(selector);
        } catch (error) {
          log('Invalid selector', selector, error);
          continue;
        }
        for (const element of elements) {
          if (!seen.has(element) && isInPlayer(element, roots)) {
            seen.add(element);
            found.push(element);
          }
        }
      }
    }

    return found;
  };

  const reportSkipped = (kind) => {
    try {
      chrome.runtime.sendMessage({ type: 'AD_SKIPPED', kind }, () => {
        // Chrome exposes a harmless connection error when the worker is asleep,
        // the extension was reloaded, or the page belongs to an old instance.
        // Reading lastError in the callback intentionally consumes it.
        const connectionError = chrome.runtime.lastError;
        if (connectionError) log('Statistics worker unavailable:', connectionError.message);
      });
    } catch (error) {
      log('Statistics message could not be sent:', error);
      // Skipping must continue locally even when the worker is unavailable.
    }
  };

  const activate = (element, kind) => {
    if (!enabled || actedOn.has(element)) return false;
    if (Date.now() - lastActionAt < CONFIG.clickCooldownMs) return false;
    if (!isVisibleAndInteractive(element)) return false;

    actedOn.add(element);
    lastActionAt = Date.now();
    try {
      element.click();
      reportSkipped(kind);
      log('Activated', kind, element);
      return true;
    } catch (error) {
      log('Activation failed', kind, error);
      return false;
    }
  };

  const scan = (reason) => {
    if (!enabled) return false;
    lastScanAt = Date.now();
    scanCount += 1;
    const roots = getSearchRoots();

    const skipButtons = findCandidates(SKIP_SELECTORS, roots);
    for (const button of skipButtons) {
      if (activate(button, 'skip')) {
        log('Skip control activated', { reason, scanCount });
        return true;
      }
    }

    const closeButtons = findCandidates(CLOSE_SELECTORS, roots);
    for (const button of closeButtons) {
      if (activate(button, 'overlay-close')) {
        log('Overlay close control activated', { reason, scanCount });
        return true;
      }
    }

    return false;
  };

  const scheduleScan = (reason) => {
    if (!enabled) return;
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      scan(reason);
    }, CONFIG.debounceMs);
  };

  const setupObserver = () => {
    if (observer || !document.documentElement) return;

    observer = new MutationObserver((mutations) => {
      const meaningful = mutations.some((mutation) => {
        if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) return true;
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          return target instanceof Element && (
            target.matches('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, [aria-label*="Skip ad" i]') ||
            target.closest('.ytp-ad-module, .video-ads, .ytp-ad-overlay-container') !== null
          );
        }
        return false;
      });
      if (meaningful) scheduleScan('mutation');
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-label', 'aria-hidden', 'disabled']
    });
  };

  const applyEnabled = (nextEnabled) => {
    enabled = nextEnabled !== false;
    if (enabled) scheduleScan('enabled');
  };

  const initialize = () => {
    getStoredEnabled((storedEnabled) => {
      applyEnabled(storedEnabled);
      setupObserver();
      scan('initial');
      window.setTimeout(() => scan('delayed-initial'), 250);
    });
  };

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.enabled) applyEnabled(changes.enabled.newValue);
  });

  window.addEventListener('yt-navigate-finish', () => scheduleScan('yt-navigate-finish'));
  window.addEventListener('yt-page-data-updated', () => scheduleScan('yt-page-data-updated'));
  window.addEventListener('popstate', () => scheduleScan('popstate'));
  document.addEventListener('visibilitychange', () => scheduleScan('visibilitychange'));

  window.setInterval(() => {
    if (enabled && Date.now() - lastScanAt >= CONFIG.fallbackIntervalMs) scan('fallback');
  }, CONFIG.fallbackIntervalMs);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
