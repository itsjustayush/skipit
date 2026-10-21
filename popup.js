const enabledToggle = document.querySelector('#enabled-toggle');
const todayValue = document.querySelector('#today');
const totalValue = document.querySelector('#total');
const acceleratedValue = document.querySelector('#accelerated');
const totalAcceleratedValue = document.querySelector('#total-accelerated');
const resetButton = document.querySelector('#reset');
const statusDot = document.querySelector('#status-dot');
const statusText = document.querySelector('#status-text');
const stateDescription = document.querySelector('#state-description');
const statusMsg = document.querySelector('#status');

// Filter UI Elements
const resetFiltersBtn = document.querySelector('#reset-filters');
const presetChips = document.querySelectorAll('.preset-chip');
const brightnessSlider = document.querySelector('#filter-brightness');
const contrastSlider = document.querySelector('#filter-contrast');
const saturationSlider = document.querySelector('#filter-saturation');
const warmthSlider = document.querySelector('#filter-warmth');

const valBrightness = document.querySelector('#val-brightness');
const valContrast = document.querySelector('#val-contrast');
const valSaturation = document.querySelector('#val-saturation');
const valWarmth = document.querySelector('#val-warmth');

const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  temperature: 0,
  preset: 'normal'
};

const PRESETS = {
  normal: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, temperature: 0 },
  night: { brightness: 80, contrast: 115, saturation: 90, grayscale: 0, sepia: 20, temperature: 20 },
  'blue-cut': { brightness: 95, contrast: 100, saturation: 95, grayscale: 0, sepia: 35, temperature: 40 },
  vivid: { brightness: 105, contrast: 115, saturation: 130, grayscale: 0, sepia: 0, temperature: 0 },
  mono: { brightness: 100, contrast: 110, saturation: 0, grayscale: 100, sepia: 0, temperature: 0 }
};

let currentFilters = { ...DEFAULT_FILTERS };
let toastTimer = null;

const showToast = (text) => {
  if (toastTimer) window.clearTimeout(toastTimer);
  statusMsg.textContent = text;
  toastTimer = window.setTimeout(() => {
    statusMsg.textContent = '';
  }, 1400);
};

const send = (message) => new Promise((resolve) => {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      // Consuming lastError prevents unchecked runtime errors when worker is dormant
      const connectionError = chrome.runtime.lastError;
      if (connectionError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  } catch (_error) {
    resolve(null);
  }
});

const renderState = (state) => {
  if (!state) return;
  const isEnabled = state.enabled !== false;
  const stats = state.stats || {};

  enabledToggle.checked = isEnabled;
  todayValue.textContent = String(stats.todaySkipped || 0);
  totalValue.textContent = String(stats.totalSkipped || 0);
  acceleratedValue.textContent = String(stats.acceleratedAds || 0);
  totalAcceleratedValue.textContent = String(stats.totalAcceleratedAds || 0);

  if (isEnabled) {
    statusDot.classList.remove('off');
    statusText.textContent = 'Active on YouTube';
    stateDescription.textContent = 'Auto-skips & fast-forwards ads at 16×';
  } else {
    statusDot.classList.add('off');
    statusText.textContent = 'Auto-skip is paused';
    stateDescription.textContent = 'Autopilot paused until turned back on';
  }
};

const renderFilters = (filters) => {
  currentFilters = { ...DEFAULT_FILTERS, ...(filters || {}) };

  brightnessSlider.value = currentFilters.brightness;
  contrastSlider.value = currentFilters.contrast;
  saturationSlider.value = currentFilters.saturation;
  warmthSlider.value = currentFilters.sepia || currentFilters.temperature || 0;

  valBrightness.textContent = `${currentFilters.brightness}%`;
  valContrast.textContent = `${currentFilters.contrast}%`;
  valSaturation.textContent = `${currentFilters.saturation}%`;
  valWarmth.textContent = `${warmthSlider.value}%`;

  const activePreset = currentFilters.preset || 'normal';
  for (const chip of presetChips) {
    chip.classList.toggle('active', chip.dataset.preset === activePreset);
  }
};

const saveFilters = (newFilters) => {
  currentFilters = { ...currentFilters, ...newFilters };
  chrome.storage.local.set({ filters: currentFilters }, () => {
    renderFilters(currentFilters);
  });
};

const refresh = async () => {
  renderState(await send({ type: 'GET_STATE' }));
  chrome.storage.local.get({ filters: DEFAULT_FILTERS }, (res) => {
    if (chrome.runtime.lastError) return;
    renderFilters(res.filters);
  });
};

// Filter event listeners
brightnessSlider.addEventListener('input', () => {
  valBrightness.textContent = `${brightnessSlider.value}%`;
  saveFilters({ brightness: Number(brightnessSlider.value), preset: 'custom' });
});

contrastSlider.addEventListener('input', () => {
  valContrast.textContent = `${contrastSlider.value}%`;
  saveFilters({ contrast: Number(contrastSlider.value), preset: 'custom' });
});

saturationSlider.addEventListener('input', () => {
  valSaturation.textContent = `${saturationSlider.value}%`;
  saveFilters({ saturation: Number(saturationSlider.value), preset: 'custom' });
});

warmthSlider.addEventListener('input', () => {
  valWarmth.textContent = `${warmthSlider.value}%`;
  const val = Number(warmthSlider.value);
  saveFilters({ sepia: val, temperature: val, preset: 'custom' });
});

for (const chip of presetChips) {
  chip.addEventListener('click', () => {
    const presetKey = chip.dataset.preset;
    const presetValues = PRESETS[presetKey] || PRESETS.normal;
    saveFilters({ ...presetValues, preset: presetKey });
    showToast(`Preset: ${chip.textContent.trim()}`);
  });
}

resetFiltersBtn.addEventListener('click', () => {
  saveFilters({ ...DEFAULT_FILTERS });
  showToast('Filters cleared');
});

// Switch and stats reset
enabledToggle.addEventListener('change', async () => {
  const isEnabled = enabledToggle.checked;
  const response = await send({ type: 'TOGGLE_ENABLED', enabled: isEnabled });
  if (response?.ok) {
    renderState({ enabled: isEnabled, stats: {
      todaySkipped: Number(todayValue.textContent) || 0,
      totalSkipped: Number(totalValue.textContent) || 0,
      acceleratedAds: Number(acceleratedValue.textContent) || 0,
      totalAcceleratedAds: Number(totalAcceleratedValue.textContent) || 0
    }});
    showToast(isEnabled ? 'Autopilot enabled' : 'Autopilot paused');
  } else {
    showToast('Failed to update');
  }
});

resetButton.addEventListener('click', async () => {
  const response = await send({ type: 'RESET_STATS' });
  if (response?.ok) {
    renderState(response);
    showToast('Statistics reset');
  } else {
    showToast('Unable to reset');
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.enabled || changes.stats) refresh();
    if (changes.filters) renderFilters(changes.filters.newValue);
  }
});

refresh();
