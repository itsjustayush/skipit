# SkipIt — YouTube Ad Autopilot & Video Enhancer

<p align="left">
  <img src="icons/icon-48.png" alt="SkipIt Logo" width="48" height="48" />
</p>

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg?style=flat-square)](#)
[![Version 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue.svg?style=flat-square)](#)
[![Chromium Supported](https://img.shields.io/badge/Browsers-Chrome%20%7C%20Edge%20%7C%20Brave-orange.svg?style=flat-square)](#)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local%20%E2%80%A2%20Zero%20Tracking-purple.svg?style=flat-square)](#)

> **SkipIt** is a high-performance, privacy-first Chromium extension engineered to automate YouTube ad handling and elevate your video viewing experience. It automatically triggers native **Skip Ad** buttons, dismisses overlays, accelerates ad media up to **16× (muted)**, auto-seeks ad videos to completion, and provides live **Custom Video Filters** (Night Mode, Blue-Light reduction, Brightness, Contrast, Saturation) in a tactile **Neo-Brutalist** dashboard.

---

## ⚡ What Makes SkipIt Different?

Unlike blunt request blockers that trigger YouTube's *"Ad blockers violate YouTube's Terms of Service"* modal, **SkipIt** interacts directly with YouTube's HTML5 media engine and DOM. It handles skippable, unskippable, overlay, and countdown ads safely without breaking video playback.

Most importantly, SkipIt is specifically engineered for **Background Tabs**—so if you are listening to podcasts, music, or study streams in an inactive tab while working in another window, ads are muted, sped up, and skipped with **zero manual intervention**.

---

## 🚀 Key Features

### 1. ⚡ Ad Autopilot & Instant Skipping
- **Native Skip Clicks**: Instantly fires full pointer and mouse event pipelines (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`) on `.ytp-ad-skip-button`, modern variant classes, and container slots.
- **Proactive Internal Skip**: Automatically invokes YouTube's native player `skipAd()` method when exposed.
- **Muted 16× Ad Acceleration**: As soon as an ad is detected, it mutes audio instantly and boosts video playback rate to 16×.
- **Smart End-of-Ad Seeking**: Sets ad media timestamp directly to its end timestamp (`duration - 0.02s`), ending countdown ads in milliseconds.
- **Zero-Lag Video Replay**: Automatically kicks off `video.play()` at `+30ms` and `+100ms` when returning to the main video, completely eliminating the transition buffer lull.
- **Auto-Dismiss Overlays**: Automatically closes promo cards, mealbar banners, and anti-adblock enforcement dialogs.

### 2. 🎧 Seamless Background-Tab Operation
- **Bypasses Browser Throttling**: Browsers throttle timers (`setTimeout`/`setInterval`) in background tabs to save battery. SkipIt hooks directly into HTML5 `<video>` media event streams (`timeupdate`, `loadedmetadata`, `play`, `playing`, `ended`), guaranteeing real-time ad reaction without lag.
- **Decoupled Viewport Check**: Detects `document.visibilityState === 'hidden'` to bypass bounding-box viewport constraints so hidden tabs are fully serviced.
- **Original Settings Restored**: Preserves your volume, mute status, and preferred speed (1.25×, 1.5×, 2.0×) before an ad runs, and restores them the moment your video resumes.

### 3. 🎨 Custom Video Enhancer (Live GPU CSS Filters)
Enhance video clarity, protect your eyes during late-night watching, or adjust display contrast:
- **Brightness**: 50% to 150%
- **Contrast**: 50% to 150%
- **Saturation**: 0% (Monochrome) to 200% (Hyper-vivid)
- **Warmth (Blue-Light Cut)**: Amber spectrum shift for relaxed late-night viewing
- **One-Click Presets**:
  - `OFF`: Clean original video stream
  - `NIGHT`: Darkened brightness (80%), high contrast (115%), warm tint
  - `WARM / EYE CARE`: 35% sepia warm-shift with blue-light attenuation
  - `VIVID`: Rich color pop with boosted saturation and contrast
  - `B&W`: Pure cinematic monochrome grayscale
- **Per-User Persistence**: Filter adjustments apply in real time and automatically persist across video navigation and browser restarts via `chrome.storage.local`.

### 4. 🖤 Neo-Brutalist Dashboard
- Designed with high-contrast borders, hard offset drop shadows (`3.5px 3.5px 0px #000`), monospace counters, and tactile button presses.
- **Dual Analytics**: Tracks **Native Skips** and **16× Fast-Forwarded Ads** (Today vs. All-Time).
- **Status Indicator**: Live pulsating indicator badge (`ACTIVE ON YOUTUBE` / `PAUSED`).

---

## 📦 Installation Guide

SkipIt can be loaded into any Chromium browser in less than 30 seconds.

### Google Chrome & Brave
1. Clone or download this repository to your machine:
   ```bash
   git clone https://github.com/itsjustayush/skipit.git
   ```
2. Open Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** via the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left toolbar.
5. Select the `skipit` repository folder (the directory containing `manifest.json`).
6. Pin **SkipIt** to your browser toolbar for easy access.

### Microsoft Edge
1. Navigate to:
   ```text
   edge://extensions
   ```
2. Enable **Developer mode** using the toggle switch in the left sidebar.
3. Click **Load unpacked** and choose the `skipit` directory.

### Opera & Vivaldi
1. Navigate to `opera://extensions` or `vivaldi://extensions`.
2. Toggle on **Developer Mode**.
3. Click **Load unpacked** and select the folder.

---

## 🎯 Usage Guide

1. **Automatic Operation**: Once installed, SkipIt works automatically on all YouTube videos. You do not need to click anything.
2. **Toggle Autopilot**: Click the extension icon in your browser toolbar to open the Neo-Brutalist dashboard. Use the master toggle to pause or resume ad skipping.
3. **Adjust Video Filters**: Open the dashboard and click any preset (`NIGHT`, `WARM`, `VIVID`, `B&W`) or drag sliders to fine-tune brightness, contrast, saturation, or warmth. Changes appear instantly on the playing video.
4. **Reset Counters or Filters**:
   - Click `RESET STATS` to reset skip counters back to 0.
   - Click `CLEAR` on the Video Enhancer card to reset all video filters back to standard defaults.

---

## 🛠️ Architecture & File Structure

```text
skipit/
├── manifest.json         # Manifest V3 configuration (scoped to YouTube)
├── content.js            # Core engine: ad state detection, 16× acceleration, & live CSS filters
├── background.js         # Service worker: local statistics and state synchronization
├── popup.html            # Neo-Brutalist dashboard interface
├── popup.css             # High-contrast brutalist styling and custom range sliders
├── popup.js              # Dashboard logic, live filter sync, and message handlers
├── icons/                # Extension icon assets (16, 32, 48, 128 px)
├── tests/
│   ├── validate.mjs      # Strict syntax, permissions, and specification test suite
│   └── content-smoke.mjs # Mock DOM content-script smoke test
├── tools/
│   └── make_icons.py     # High-resolution icon generation script
├── CHANGELOG.md          # Complete semantic versioning release notes
├── package.json          # Project metadata and test runner scripts
└── README.md             # Project documentation
```

---

## 🧪 Testing & Validation

SkipIt includes an automated, dependency-free test suite that validates Manifest V3 compliance, scoped permissions, syntax, and DOM event handling:

```bash
npm test
```

### What is tested:
- **Manifest V3 Scoping**: Validates permissions (`storage` only; strict rejection of broad `activeTab` or `<all_urls>`).
- **Syntax Integrity**: Verifies zero syntax errors across all JavaScript modules via `node --check`.
- **Content Script Mechanics**: Tests `WeakSet` deduplication, `MutationObserver`, visibility handling, and message channel safety.
- **Mock DOM Execution**: Simulates YouTube player button insertion, ad acceleration hooks, and messaging in an isolated virtual context.

---

## 🔒 Security & Privacy Statement

- **No Remote Requests**: SkipIt does not make any network requests (`fetch` and `XMLHttpRequest` are completely absent).
- **Strictly Scoped Host Permissions**: Operates exclusively on `*://*.youtube.com/*` and `*://*.youtube-nocookie.com/*`.
- **Local Storage Only**: All settings and metrics stay on your machine in `chrome.storage.local`.
- **Zero Third-Party Telemetry**: No analytics, trackers, cookies, or external scripts are bundled or loaded.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
