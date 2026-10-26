import { initCookies } from './cookies.js';

const STORAGE_KEY = 'index360.preferences.v1';

function readStoredPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return value?.remember === true ? value : null;
  } catch {
    return null;
  }
}

function persistPreferences(remember, chartPreferences) {
  try {
    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ remember: true, ...chartPreferences }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    return true;
  } catch {
    // Filters still work when browser storage is blocked or full.
    return false;
  }
}

export function initPreferences() {
  let chartPreferences = null;
  const cookies = initCookies((consent) => {
    persistPreferences(consent.functional, chartPreferences);
  });
  if (cookies.allowsFunctional()) chartPreferences = readStoredPreferences();

  return {
    readChartPreferences() {
      return cookies.allowsFunctional() ? chartPreferences : null;
    },
    saveChartPreferences(state) {
      chartPreferences = {
        metric: state.metric,
        retailYears: [...state.retailYears],
        paymentYear: state.paymentYear,
      };
      if (cookies.allowsFunctional()) persistPreferences(true, chartPreferences);
    },
  };
}
