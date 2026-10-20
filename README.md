# SkipIt

SkipIt is a high-performance Manifest V3 extension for Chrome and Chromium-based browsers that automatically handles YouTube ads. It clicks native **Skip Ad** and overlay-close buttons immediately, detects active ad states, mutes and accelerates ad videos up to 16×, and seeks them to the end when a duration is available.

It is specifically engineered to handle **background tabs** seamlessly—so if you are listening to music, podcasts, or tutorials in a YouTube tab while working in another tab or window, ads are muted, accelerated, and skipped without requiring you to switch back and click manually.

---

## What SkipIt Does

- **Auto-clicks Native Skip Controls**: Instantly triggers skip buttons (`.ytp-ad-skip-button`, modern buttons, mobile buttons, and accessible labels).
- **Mutes & Accelerates (16×)**: As soon as an ad video starts, it mutes audio immediately and boosts video playback rate to 16×.
- **Auto-Seeks to End**: Jumps ad media near its end timestamp to finish non-skippable or skippable ads in milliseconds.
- **Background-Tab Resilient**: Listens directly to HTML5 video media events (`timeupdate`, `loadedmetadata`, `play`, `playing`) to bypass background tab timer throttling.
- **Restores User Settings**: Restores your original volume, mute state, and playback rate immediately when the ad finishes.
- **Dismisses Overlays & Popups**: Closes ad overlay banners, promo cards, and anti-adblock enforcement dialogs automatically.
- **Modern Popup Dashboard**: Toggle autopilot on/off, inspect native skip and fast-forward statistics (today vs. all-time), and view live status.
- **Strict Local Privacy**: Operates solely with YouTube-scoped permissions and `chrome.storage.local`. No analytics, tracking, or network requests.

---

## Installation (Unpacked)

1. Clone or download this repository.
2. Open your Chromium browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave / Opera / Vivaldi: `chrome://extensions`
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select this directory (`d:\skipit`).
5. Open any YouTube video to enjoy hands-free ad skipping.

---

## How Background Tab Handling Works

Browsers typically throttle JavaScript timers (`setTimeout` and `setInterval`) to once per second (or slower) in background tabs to conserve battery.

SkipIt solves this by:
1. **Hooking Media Events Directly**: Registering event listeners (`timeupdate`, `loadedmetadata`, `play`, etc.) directly on HTML5 `<video>` elements. In background tabs, decoding and audio rendering continue in real time, so these events fire continuously without timer throttling.
2. **Decoupled Viewport Checks**: Unlike naive extensions that check if an element is inside the visible viewport, SkipIt detects when `document.visibilityState === 'hidden'` and relies on element connectivity and display styling rather than viewport intersection.
3. **Instant Audio Muting**: Ad audio is muted before you even notice an ad has started, protecting your workflow.

---

## Testing & Validation

The extension includes automated syntax and smoke tests:

```bash
npm test
```

This verifies:
- Manifest V3 specification and host permissions scoping
- Version consistency across `manifest.json`, `package.json`, and `VERSION`
- Content script syntax, observer patterns, and ad acceleration logic
- Mock DOM smoke tests simulating YouTube player events and button activation
- Service worker and popup message safety (consuming `chrome.runtime.lastError`)

---

## Privacy & Security

- **Host Permissions**: Limited exclusively to `*://*.youtube.com/*` and `*://*.youtube-nocookie.com/*`.
- **Zero Remote Communications**: Does not make any external network requests or embed third-party tracking scripts.
- **Local Storage Only**: Statistics and enable toggles are stored strictly on your local machine.
