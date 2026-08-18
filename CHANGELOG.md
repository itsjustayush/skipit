# Changelog

All notable changes to SkipIt are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-08-18

### Added

- Initial Manifest V3 Chrome and Edge extension baseline.
- Automatic activation of visible YouTube skip-ad controls.
- Overlay-ad close-control fallback.
- MutationObserver, YouTube navigation events, visibility events, initial scans, and throttled fallback scans.
- Local enable/disable setting and local activation statistics.
- Popup interface for status, statistics, and reset controls.
- Static validation suite and repository documentation.

### Security and privacy

- Restricted host matching to YouTube and YouTube’s no-cookie domain.
- No external network requests, analytics, or account access.
- No broad `scripting`, `activeTab`, or `<all_urls>` permissions are required.
