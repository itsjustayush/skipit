# Changelog

All notable changes to SkipIt are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-08-18

### Added

- Today-versus-total local activation statistics from the original local implementation.
- Mobile YouTube host matching for `m.youtube.com`.
- Popup statistics for skipped controls today and across all time.
- Popup enable/disable control routed through the service worker.
- PNG icon assets in 16, 32, 48, and 128 pixel sizes.

### Fixed

- Defined and normalized the missing statistics defaults used by the original background worker.
- Preserved the setting when resetting statistics.
- Kept the original useful overlay-close selectors while retaining player-scoped and visibility-guarded activation.
- Added compatibility handling for both the new `GET_STATE` message and the original `GET_STATS` message.

## [0.1.0] - 2026-08-18

### Added

- Initial Manifest V3 Chrome and Edge extension baseline.
- Automatic activation of visible YouTube skip-ad controls.
- Overlay-ad close-control fallback.
- MutationObserver, YouTube navigation events, visibility events, initial scans, and throttled fallback scans.
- Local enable/disable setting and local activation statistics.
- Popup interface and dependency-free validation suite.
- Repository documentation and release metadata.

### Security and privacy

- Restricted host matching to YouTube and YouTube’s no-cookie domain.
- No external network requests, analytics, or account access.
- No broad `scripting`, `activeTab`, or `<all_urls>` permissions are required.
