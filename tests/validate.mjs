import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const root = existsSync(path.join(currentDir, 'manifest.json'))
  ? currentDir
  : path.resolve(currentDir, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

const manifest = JSON.parse(await read('manifest.json'));
const version = (await read('VERSION')).trim();
const packageJson = JSON.parse(await read('package.json'));
const content = await read('content.js');
const background = await read('background.js');
const popup = await read('popup.js');

assert.equal(manifest.manifest_version, 3, 'Manifest V3 is required');
assert.equal(manifest.version, version, 'manifest.json and VERSION must match');
assert.equal(packageJson.version, version, 'package.json and VERSION must match');
assert.match(version, /^\d+\.\d+\.\d+$/, 'version must use semantic version format');
assert.equal(manifest.background.service_worker, 'background.js');
assert.deepEqual(manifest.content_scripts[0].js, ['content.js']);
assert.equal(manifest.content_scripts[0].run_at, 'document_start');
assert.ok(manifest.permissions.includes('storage'));
assert.ok(!manifest.permissions.includes('activeTab'));
assert.ok(!manifest.permissions.includes('scripting'));
assert.ok(!manifest.host_permissions.includes('<all_urls>'));
assert.ok(manifest.host_permissions.every((host) => host.includes('youtube')));

for (const file of ['manifest.json', 'content.js', 'background.js', 'popup.html', 'popup.js', 'popup.css', 'README.md', 'CHANGELOG.md', 'VERSION', 'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png']) {
  assert.ok(existsSync(path.join(root, file)), `${file} must exist`);
}

for (const file of ['content.js', 'background.js', 'popup.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
}

for (const [needle, description] of [
  ['MutationObserver', 'DOM mutation detection'],
  ['fallback', 'fallback scan documentation or behavior'],
  ['yt-navigate-finish', 'YouTube SPA navigation handling'],
  ["document.addEventListener('visibilitychange'", 'visibility change handling'],
  ['aria-label*="Skip ad" i', 'accessible skip selector'],
  ['WeakSet', 'duplicate activation protection'],
  ['chrome.storage.onChanged', 'live settings updates'],
  ['chrome.runtime.sendMessage', 'local statistics reporting'],
  ['playbackRate', 'ad media acceleration'],
  ['visibilityState', 'background-tab handling']
]) {
  assert.ok(content.includes(needle), `${description} must be present in content.js`);
}

assert.ok(background.includes('DEFAULT_STATS'));
assert.ok(background.includes('todaySkipped'));
assert.ok(background.includes('totalSkipped'));
assert.ok(background.includes('AD_ACCELERATED'));
assert.ok(background.includes('acceleratedAds'));
assert.ok(background.includes('AD_SKIPPED'));
assert.ok(background.includes('RESET_STATS'));
assert.ok(popup.includes('GET_STATE'));
assert.ok(popup.includes('enabled'));
assert.ok(content.includes('chrome.runtime.lastError'));
assert.ok(popup.includes('chrome.runtime.lastError'));
assert.ok(!content.match(/sendMessage\([^;]+\)\.catch/));

for (const [code, fileName] of [[content, 'content.js'], [background, 'background.js'], [popup, 'popup.js']]) {
  assert.ok(!code.includes('fetch('), `${fileName} must not contain fetch`);
  assert.ok(!code.includes('XMLHttpRequest'), `${fileName} must not contain XMLHttpRequest`);
  assert.ok(!code.includes('sendBeacon'), `${fileName} must not contain sendBeacon`);
  assert.ok(!code.includes('WebSocket'), `${fileName} must not contain WebSocket`);
  assert.ok(!code.includes('eval('), `${fileName} must not contain eval`);
  assert.ok(!code.includes('new Function'), `${fileName} must not contain new Function`);
  assert.ok(!code.includes('innerHTML'), `${fileName} must not contain innerHTML`);
}

console.log(`SkipIt ${version}: validation & security checks passed`);
