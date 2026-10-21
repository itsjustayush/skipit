# Changelog

All notable changes to SkipIt are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-21

### Milestone Release: The Complete YouTube Autopilot & Enhancer

### Added
- **Custom Video Enhancer**:
  - Live CSS video filters persisted per user via `chrome.storage.local`.
  - Fine-grained controls: Brightness (50% - 150%), Contrast (50% - 150%), Saturation (0% - 200%), Warmth / Blue-Light reduction (0% - 100%), and Grayscale.
  - One-click presets: `OFF`, `NIGHT`, `WARM / EYE CARE`, `VIVID`, and `B&W`.
  - Instant filter application across dynamic player elements and single-page navigation.
- **Neo-Brutalist UI**:
  - Tactile high-contrast design with sharp `2px` black borders, hard offset drop shadows (`3.5px 3.5px 0px #000`), monospace metrics, and punchy accent badges.
- **Latency-Free Skipping & Replay Kickstarting**:
  - Removed trailing debounce delays in favor of an ultra-responsive 12ms throttle.
  - Multi-event click dispatching (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`) targeting both skip buttons and container slots.
  - Proactive invocation of internal `moviePlayer.skipAd()` if exposed by YouTube.
  - Automatic `video.play()` kickstarts at `+30ms` and `+100ms` after ad dismissal to eliminate buffer lull during source buffer handoffs.

## [0.3.0] - 2026-10-20

### Added
- Layered ad autopilot: native Skip Ad button clicking, ad overlay and promo dismissal, ad-state detection, muted 16× acceleration, and seek-to-end for ad media.
- Seamless background tab ad handling: does not restrict checks to visible viewports when the document is hidden; attaches directly to `<video>` events (`timeupdate`, `loadedmetadata`, `play`, `playing`) to bypass browser timer throttling in background tabs.
- Automatic restoration of user media preferences: preserves and restores the original volume, muted state, and playback rate immediately when the ad session concludes.
- Dual-category local statistics (native skips and fast-forwarded ads).
- Anti-adblock and promo enforcement modal auto-dismissal.

## [0.2.1] - 2026-08-18

### Fixed
- Explicitly consumed `chrome.runtime.lastError` in content-script and popup message callbacks so stale or unavailable service-worker connections do not produce unchecked runtime warnings.
- Kept statistics and skip activation independent: a missing worker no longer affects the local button activation path.

## [0.2.0] - 2026-08-18

### Added
- Today-versus-total local activation statistics from the original local implementation.
- Mobile YouTube host matching for `m.youtube.com`.
- Popup statistics for skipped controls today and across all time.
- Popup enable/disable control routed through the service worker.
- PNG icon assets in 16, 32, 48, and 128 pixel sizes.

## [0.1.0] - 2026-08-18

### Added
- Initial Manifest V3 Chrome and Edge extension baseline.
- Automatic activation of visible YouTube skip-ad controls.
- Overlay-ad close-control fallback.
- MutationObserver, YouTube navigation events, visibility events, initial scans, and throttled fallback scans.
- Local enable/disable setting and local activation statistics.
