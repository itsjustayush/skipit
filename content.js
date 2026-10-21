(() => {
  'use strict';

  const CONFIG = Object.freeze({
    throttleMs: 12,
    fallbackIntervalMs: 120,
    clickCooldownMs: 60,
    adPlaybackRate: 16,
    debug: false
  });

  const SKIP_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-skip-ad-button-modern',
    '.videoAdUiSkipButton',
    'button[id^="skip-button"]',
    'button[class*="skip-button"]',
    'button[class*="ytp-ad-skip"]',
    '.ytp-ad-skip-button-container button',
    '.ytp-ad-skip-button-slot button',
    '.ytp-ad-skip-button-slot',
    'button.ytp-ad-skip-button-text',
    'button[aria-label*="Skip ad" i]',
    '[role="button"][aria-label*="Skip ad" i]',
    'button[data-tooltip*="Skip" i]',
    '[role="button"][data-tooltip*="Skip" i]'
  ];

  const CLOSE_SELECTORS = [
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-overlay-close-container button',
    'button.ytp-ad-overlay-close-button-modern',
    '.ytp-ad-overlay-close-icon-modern',
    '.ytp-ad-image-overlay .ytp-ad-overlay-close-button',
    'ytd-mealbar-promo-renderer #dismiss-button',
    'tp-yt-paper-dialog #dismiss-button',
    'ytd-enforcement-message-view-model #dismiss-button'
  ];

  const PLAYER_SELECTORS = [
    '#movie_player',
    '.html5-video-player',
    'ytd-player',
    'ytd-watch-flexy #player'
  ];

  const AD_STATE_SELECTORS = [
    '.ad-showing',
    '.ad-interrupting',
    '.ytp-ad-player-overlay',
    '.ytp-ad-player-overlay-layout',
    '.ytp-ad-preview-container',
    '.videoAdUi',
    '.ytp-ad-text',
    '.ytp-ad-skip-button',
    '.ytp-ad-overlay-container'
  ];

  let enabled = true;
  let observer = null;
  let scanPending = false;
  let lastScanAt = 0;
  let lastActionAt = 0;
  let scanCount = 0;
  let adSessionActive = false;
  const actedOn = new WeakSet();
  const mediaStates = new WeakMap();
  const watchedVideos = new WeakSet();

  const log = (...args) => {
    if (CONFIG.debug) console.debug('[SkipIt]', ...args);
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

    // When running in background tabs, do not enforce visible viewport intersection.
    const rect = element.getBoundingClientRect();
    if (document.visibilityState === 'hidden') {
      return style.display !== 'none';
    }
    return rect.width > 0 && rect.height > 0;
  };

  const queryOne = (selector, root = document) => {
    try {
      if (typeof root?.querySelector === 'function') return root.querySelector(selector);
      if (typeof root?.querySelectorAll === 'function') return root.querySelectorAll(selector)[0] || null;
    } catch (_e) {}
    return null;
  };

  const getSearchRoots = () => {
    const roots = PLAYER_SELECTORS
      .flatMap((selector) => {
        try {
          return Array.from(document.querySelectorAll(selector));
        } catch (_e) {
          return [];
        }
      })
      .filter((element, index, all) => all.indexOf(element) === index);
    return roots.length > 0 ? roots : [document];
  };

  const isInPlayer = (element, roots) => roots.some((root) => root === document || root === element || root.contains(element));

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

  const report = (type, kind) => {
    try {
      chrome.runtime.sendMessage({ type, kind }, () => {
        const connectionError = chrome.runtime.lastError;
        if (connectionError) log('Statistics worker unavailable:', connectionError.message);
      });
    } catch (error) {
      log('Statistics message could not be sent:', error);
    }
  };

  const dispatchFullClick = (target) => {
    if (!target) return;
    try { target.click(); } catch (_e) {}
    try {
      target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch (_e) {}
  };

  const activate = (element, kind) => {
    if (!enabled || actedOn.has(element)) return false;
    if (Date.now() - lastActionAt < CONFIG.clickCooldownMs) return false;
    if (!isVisibleAndInteractive(element)) return false;

    actedOn.add(element);
    lastActionAt = Date.now();
    try {
      // 1. Direct and pointer-sequence click on element
      dispatchFullClick(element);

      // 2. If inside a button slot or container, click the parent as well
      const slot = element.closest?.('.ytp-ad-skip-button-slot, .ytp-ad-skip-button-container');
      if (slot && slot !== element) {
        dispatchFullClick(slot);
      }

      // 3. Proactively call player skipAd if available
      const player = queryOne('#movie_player');
      if (typeof player?.skipAd === 'function') {
        try { player.skipAd(); } catch (_e) {}
      }

      report('AD_SKIPPED', kind);
      log('Activated', kind, element);
      return true;
    } catch (error) {
      log('Activation failed', kind, error);
      return false;
    }
  };

  const hasAdMarker = (roots) => {
    const player = queryOne('#movie_player, .html5-video-player');
    if (player && player.classList && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
      return true;
    }

    const overlay = queryOne('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout, .ytp-ad-preview-container, .videoAdUi');
    if (overlay) {
      const style = window.getComputedStyle(overlay);
      if (style.display !== 'none' && style.visibility !== 'hidden') return true;
    }

    for (const root of roots) {
      if (root !== document && root.classList && (root.classList.contains('ad-showing') || root.classList.contains('ad-interrupting'))) {
        return true;
      }
      for (const selector of AD_STATE_SELECTORS) {
        const marker = queryOne(selector, root);
        if (marker && (selector === '.ad-showing' || selector === '.ad-interrupting' || selector === '.ytp-ad-player-overlay' || selector === '.ytp-ad-preview-container' || selector === '.videoAdUi')) {
          const style = window.getComputedStyle(marker);
          if (style.display !== 'none' && style.visibility !== 'hidden') return true;
        }
      }
    }
    return findCandidates(SKIP_SELECTORS, roots).some((button) => !actedOn.has(button));
  };

  const attachVideoHooks = (video) => {
    if (!video || watchedVideos.has(video) || typeof video.addEventListener !== 'function') return;
    watchedVideos.add(video);

    const onMediaUpdate = () => {
      if (enabled) scheduleScan('media-event', false);
    };

    video.addEventListener('timeupdate', onMediaUpdate);
    video.addEventListener('loadedmetadata', onMediaUpdate);
    video.addEventListener('durationchange', onMediaUpdate);
    video.addEventListener('play', onMediaUpdate);
    video.addEventListener('playing', onMediaUpdate);
    video.addEventListener('ended', onMediaUpdate);
  };

  const getVideos = (roots) => {
    const videos = [];
    const seen = new Set();
    for (const root of roots) {
      if (!root || typeof root.querySelectorAll !== 'function') continue;
      const candidates = root.querySelectorAll('video');
      for (const video of candidates) {
        if (!seen.has(video)) {
          seen.add(video);
          videos.push(video);
          attachVideoHooks(video);
        }
      }
    }
    return videos;
  };

  const accelerateAdMedia = (videos) => {
    for (const video of videos) {
      if (!mediaStates.has(video)) {
        mediaStates.set(video, {
          muted: video.muted,
          volume: video.volume,
          rate: video.playbackRate
        });
      }
      try {
        video.muted = true;
        video.playbackRate = CONFIG.adPlaybackRate;

        // Auto-seek near the end of the ad to trigger instant completion
        if (Number.isFinite(video.duration) && video.duration > 0) {
          if (video.currentTime < video.duration - 0.05) {
            video.currentTime = Math.max(0, video.duration - 0.02);
          }
        }

        // Call player skipAd if exposed
        const player = queryOne('#movie_player');
        if (typeof player?.skipAd === 'function') {
          try { player.skipAd(); } catch (_e) {}
        }

        if (video.paused) {
          const playResult = video.play();
          playResult?.catch?.(() => {});
        }
      } catch (error) {
        log('Ad media acceleration failed:', error);
      }
    }
  };

  const kickstartPlayback = (videos) => {
    for (const video of videos) {
      if (video && video.paused && !hasAdMarker([video.parentElement || document])) {
        const p = video.play();
        p?.catch?.(() => {});
      }
    }
  };

  const restoreMedia = (videos) => {
    for (const video of videos) {
      const state = mediaStates.get(video);
      if (!state) continue;
      try {
        video.muted = state.muted;
        video.volume = state.volume;
        video.playbackRate = state.rate;
        // Kickstart playback immediately if paused during ad-to-main video handoff
        if (video.paused) {
          const playPromise = video.play();
          playPromise?.catch?.(() => {});
        }
      } catch (error) {
        log('Media restore failed:', error);
      }
      mediaStates.delete(video);
    }
    // Follow-up unpause checks to eliminate any lingering replay lull
    window.setTimeout(() => kickstartPlayback(videos), 30);
    window.setTimeout(() => kickstartPlayback(videos), 100);
  };

  const scan = (reason) => {
    if (!enabled) return false;
    lastScanAt = Date.now();
    scanCount += 1;
    const roots = getSearchRoots();
    const skipButtons = findCandidates(SKIP_SELECTORS, roots);
    const closeButtons = findCandidates(CLOSE_SELECTORS, roots);

    let activated = false;
    for (const button of skipButtons) activated = activate(button, 'skip') || activated;
    for (const button of closeButtons) activated = activate(button, 'overlay-close') || activated;

    const adShowing = !activated && hasAdMarker(roots);
    const videos = getVideos(roots);
    if (adShowing) {
      if (!adSessionActive) {
        adSessionActive = true;
        report('AD_STARTED', 'media-acceleration');
        report('AD_ACCELERATED', 'media-acceleration');
      }
      accelerateAdMedia(videos);
      activated = true;
    } else if (adSessionActive) {
      adSessionActive = false;
      restoreMedia(videos);
      report('AD_FINISHED', 'media-acceleration');
    }

    if (activated) log('Ad handling pass complete', { reason, scanCount });
    return activated;
  };

  const scheduleScan = (reason, immediate = false) => {
    if (!enabled) return;
    if (immediate) {
      scan(reason);
      return;
    }
    if (scanPending) return;
    scanPending = true;
    window.setTimeout(() => {
      scanPending = false;
      scan(reason);
    }, CONFIG.throttleMs);
  };

  const setupStyle = () => {
    if (typeof document.getElementById !== 'function' || typeof document.createElement !== 'function') return;
    if (document.getElementById('skipit-ad-style')) return;
    const style = document.createElement('style');
    style.id = 'skipit-ad-style';
    style.textContent = `
      #movie_player.ad-showing .ytp-ad-overlay-container,
      #movie_player.ad-showing .ytp-ad-player-overlay,
      #movie_player.ad-showing .ytp-ad-text,
      #movie_player.ad-showing .ytp-ad-message-container,
      .ytd-in-feed-ad-layout-renderer,
      .ytd-ad-slot-renderer {
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const setupObserver = () => {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver((mutations) => {
      const meaningful = mutations.some((mutation) => mutation.type === 'childList' || mutation.type === 'attributes');
      if (meaningful) scheduleScan('mutation', false);
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
    if (enabled) {
      scheduleScan('enabled', true);
    } else {
      restoreMedia(getVideos(getSearchRoots()));
      adSessionActive = false;
    }
  };

  const initialize = () => {
    getStoredEnabled((storedEnabled) => {
      applyEnabled(storedEnabled);
      setupStyle();
      setupObserver();
      scan('initial');
      window.setTimeout(() => scan('delayed-initial'), 150);
    });
  };

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.enabled) applyEnabled(changes.enabled.newValue);
  });

  window.addEventListener('yt-navigate-finish', () => scheduleScan('yt-navigate-finish', true));
  window.addEventListener('yt-page-data-updated', () => scheduleScan('yt-page-data-updated', true));
  window.addEventListener('popstate', () => scheduleScan('popstate', true));
  document.addEventListener('visibilitychange', () => scheduleScan('visibilitychange', false));

  window.setInterval(() => {
    if (enabled && Date.now() - lastScanAt >= CONFIG.fallbackIntervalMs) scan('fallback');
  }, CONFIG.fallbackIntervalMs);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
