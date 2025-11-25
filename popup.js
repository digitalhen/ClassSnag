'use strict';

const STORAGE_KEYS = {
  REFRESH_ENABLED: 'refreshEnabled',
  REFRESH_AMOUNT: 'refreshAmount',
  ADD_TO_BASKET_ENABLED: 'addToBasketEnabled'
};

const DEFAULT_VALUES = {
  [STORAGE_KEYS.REFRESH_ENABLED]: false,
  [STORAGE_KEYS.REFRESH_AMOUNT]: 30,
  [STORAGE_KEYS.ADD_TO_BASKET_ENABLED]: false
};

function saveSettings(settings) {
  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving settings:', chrome.runtime.lastError);
    }
  });
}

function updateRefreshAmountDisplay(value) {
  const displayElement = document.getElementById('refreshAmountText');
  if (displayElement) {
    displayElement.textContent = value;
  }
}

function handleRefreshEnabledChange(event) {
  saveSettings({ [STORAGE_KEYS.REFRESH_ENABLED]: event.target.checked });
}

function handleRefreshAmountChange(event) {
  const value = event.target.value;
  updateRefreshAmountDisplay(value);
  saveSettings({ [STORAGE_KEYS.REFRESH_AMOUNT]: parseInt(value, 10) });
}

function handleAddToBasketEnabledChange(event) {
  saveSettings({ [STORAGE_KEYS.ADD_TO_BASKET_ENABLED]: event.target.checked });
}

function loadSettings() {
  const keys = Object.values(STORAGE_KEYS);

  chrome.storage.sync.get(keys, (values) => {
    const refreshEnabled = document.getElementById('refreshEnabled');
    const refreshAmount = document.getElementById('refreshAmount');
    const addToBasketEnabled = document.getElementById('addToBasketEnabled');

    if (refreshEnabled) {
      refreshEnabled.checked = values[STORAGE_KEYS.REFRESH_ENABLED] ?? DEFAULT_VALUES[STORAGE_KEYS.REFRESH_ENABLED];
    }

    if (refreshAmount) {
      const amount = values[STORAGE_KEYS.REFRESH_AMOUNT] ?? DEFAULT_VALUES[STORAGE_KEYS.REFRESH_AMOUNT];
      refreshAmount.value = amount;
      updateRefreshAmountDisplay(amount);
    }

    if (addToBasketEnabled) {
      addToBasketEnabled.checked = values[STORAGE_KEYS.ADD_TO_BASKET_ENABLED] ?? DEFAULT_VALUES[STORAGE_KEYS.ADD_TO_BASKET_ENABLED];
    }
  });
}

function initializeEventListeners() {
  const refreshEnabled = document.getElementById('refreshEnabled');
  const refreshAmount = document.getElementById('refreshAmount');
  const addToBasketEnabled = document.getElementById('addToBasketEnabled');

  if (refreshEnabled) {
    refreshEnabled.addEventListener('change', handleRefreshEnabledChange);
  }

  if (refreshAmount) {
    refreshAmount.addEventListener('input', handleRefreshAmountChange);
  }

  if (addToBasketEnabled) {
    addToBasketEnabled.addEventListener('change', handleAddToBasketEnabledChange);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadSettings();
});