import { announce } from './dom.js';

const CONSENT_COOKIE = 'index360_consent';
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

function readConsent() {
  try {
    const cookie = document.cookie
      .split('; ')
      .find((value) => value.startsWith(`${CONSENT_COOKIE}=`));
    if (!cookie) return null;
    const consent = JSON.parse(decodeURIComponent(cookie.slice(CONSENT_COOKIE.length + 1)));
    if (
      consent.version === 1 &&
      typeof consent.functional === 'boolean' &&
      typeof consent.statistical === 'boolean' &&
      (consent.confirmed === undefined || typeof consent.confirmed === 'boolean')
    ) {
      // Older cookies cannot distinguish a toggle change from a confirmation button.
      return { ...consent, confirmed: consent.confirmed === true };
    }
  } catch {
    // An unreadable or outdated choice requires consent again.
  }
  return null;
}

function persistConsent(consent) {
  try {
    const value = encodeURIComponent(JSON.stringify(consent));
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
    const stored = readConsent();
    return (
      stored?.functional === consent.functional &&
      stored?.statistical === consent.statistical &&
      stored?.confirmed === consent.confirmed
    );
  } catch {
    return false;
  }
}

export function initCookies(onChange) {
  let consent = readConsent();
  const banner = document.getElementById('cookie-banner');
  const settings = document.getElementById('cookie-settings');
  const functional = document.getElementById('functional-cookies');
  const statistical = document.getElementById('statistical-cookies');
  banner.hidden = consent?.confirmed === true;

  function openSettings() {
    functional.checked = consent?.functional === true;
    statistical.checked = consent?.statistical === true;
    settings.showModal();
  }

  function applyConsent(functionalAllowed, statisticalAllowed, confirmChoice = true) {
    consent = {
      version: 1,
      functional: functionalAllowed,
      statistical: statisticalAllowed,
      confirmed: confirmChoice || consent?.confirmed === true,
    };
    const saved = persistConsent(consent);
    onChange(consent);
    banner.hidden = consent.confirmed;
    if (confirmChoice) settings.close();
    announce(
      saved
        ? 'Настройки cookie сохранены.'
        : 'Браузер не разрешает сохранять cookie. Настройки действуют в текущем посещении.',
    );
  }

  document.querySelectorAll('[data-dialog="cookie-settings"]').forEach((button) => {
    button.addEventListener('click', openSettings);
  });
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });
  document.querySelectorAll('[data-cookie-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const acceptAll = button.dataset.cookieAction === 'accept';
      applyConsent(acceptAll, acceptAll);
    });
  });
  [functional, statistical].forEach((toggle) => {
    toggle.addEventListener('change', () => {
      applyConsent(functional.checked, statistical.checked, false);
    });
  });

  return {
    allowsFunctional() {
      return consent?.functional === true;
    },
  };
}
