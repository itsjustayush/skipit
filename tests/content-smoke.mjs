import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'content.js'), 'utf8');

class FakeElement {
  constructor(selector) {
    this.selector = selector;
    this.isConnected = true;
    this.parentElement = null;
    this.clicked = 0;
  }

  hasAttribute() {
    return false;
  }

  getAttribute() {
    return null;
  }

  getBoundingClientRect() {
    return { top: 20, right: 120, bottom: 60, left: 20, width: 100, height: 40 };
  }

  click() {
    this.clicked += 1;
  }

  matches() {
    return false;
  }

  closest() {
    return null;
  }
}

const skipButton = new FakeElement('.ytp-ad-skip-button');
const listeners = [];
const messages = [];
const documentMock = {
  readyState: 'complete',
  documentElement: {
    querySelectorAll: (selector) => selector === '.ytp-ad-skip-button' ? [skipButton] : []
  },
  querySelectorAll: (selector) => selector === '.ytp-ad-skip-button' ? [skipButton] : [],
  addEventListener: (...args) => listeners.push(args)
};

const context = {
  console,
  Date,
  Number,
  Set,
  WeakSet,
  Array,
  HTMLElement: FakeElement,
  Element: FakeElement,
  document: documentMock,
  window: {
    innerHeight: 900,
    innerWidth: 1400,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', pointerEvents: 'auto' }),
    setTimeout: (callback) => {
      callback();
      return 1;
    },
    clearTimeout: () => {},
    setInterval: () => 1,
    addEventListener: () => {}
  },
  MutationObserver: class {
    observe() {}
  },
  chrome: {
    runtime: {
      lastError: undefined,
      sendMessage: (message, callback) => {
        messages.push(message);
        callback?.({ ok: true });
      }
    },
    storage: {
      local: {
        get: (_defaults, callback) => callback({ enabled: true }),
        set: (_value, callback) => callback?.()
      },
      onChanged: {
        addListener: () => {}
      }
    }
  }
};

vm.runInNewContext(source, context, { filename: 'content.js' });

assert.equal(skipButton.clicked, 1, 'a visible skip control should be activated once');
assert.equal(messages.length, 1, 'one activation should be reported to the service worker');
assert.equal(messages[0].type, 'AD_SKIPPED');
assert.equal(messages[0].kind, 'skip');
console.log('Content-script smoke test passed');
