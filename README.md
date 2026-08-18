# SkipIt

SkipIt is a small Manifest V3 extension for Chromium-based browsers. When a visible YouTube player exposes a native **Skip Ad** or overlay-close control, SkipIt activates that control automatically. It does not remove unskippable ads, intercept network requests, modify account data, or communicate with an external server.

## Supported browsers

SkipIt targets Chrome, Microsoft Edge, and other Chromium browsers that support Manifest V3. The extension is scoped to YouTube and YouTube’s no-cookie embed domain.

## Development installation

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the repository directory.
5. Open a YouTube video and use the extension popup to confirm that SkipIt is enabled.

The content script starts at `document_start`, then initializes as soon as the document is available. YouTube’s single-page navigation events, DOM mutations, visibility changes, and a throttled fallback scan are all used to trigger checks.

## Design notes

The implementation deliberately uses narrow, player-oriented selectors and only activates controls that are visible, connected, enabled, inside the viewport, and not contained by hidden ancestors. The extension uses local storage for the enable setting and optional activation statistics. No analytics or remote requests are included.

The service worker is used only for local state and statistics. It does not keep a persistent page alive. Browser scheduling and YouTube’s runtime implementation can change, so background-tab behavior must be validated against the browser versions being targeted rather than assumed to be guaranteed.

## Validation

Run the static validation suite with:

```bash
npm test
```

The test suite checks the manifest, required files, syntax, scoped permissions, version consistency, and important implementation safeguards. It does not replace manual browser testing with a current YouTube ad because ad delivery and markup are controlled by YouTube.

## Release process

The repository follows Semantic Versioning. The extension version in `manifest.json` and `VERSION` must match the release version, and each release should have a corresponding changelog entry and Git tag.

```bash
npm test
git diff --check
git tag v0.1.0
git push origin main --tags
```

## Limitations and responsibility

SkipIt only acts when YouTube itself exposes a visible control that the content script can identify. It cannot skip an ad that has no skip control, and selectors may require maintenance if YouTube changes its player markup. Users are responsible for reviewing and complying with the applicable platform terms and local laws before installing or distributing the extension.
