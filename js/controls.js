import { METRICS, YEAR_COLORS, PAYMENT_SERIES } from './config.js';
import { createElement } from './dom.js';

function toggleYear(state, year) {
  if (state.retailYears.has(year)) state.retailYears.delete(year);
  else state.retailYears.add(year);
}

function createYearControls(years, state, onChange) {
  for (const kind of ['retail', 'payment']) {
    const fieldset = document.getElementById(`${kind}-years`);
    const isRetail = kind === 'retail';

    for (const year of years) {
      const label = createElement(
        'label',
        undefined,
        'inline-flex items-center gap-2 text-sm leading-6 max-[360px]:gap-1.5 md:text-base',
      );
      const input = createElement('input');
      input.type = isRetail ? 'checkbox' : 'radio';
      input.name = `${kind}-years`;
      input.value = year;
      input.checked = isRetail ? state.retailYears.has(year) : state.paymentYear === year;
      const controlClass = isRetail ? 'checkbox checkbox-primary' : 'radio radio-primary';
      input.className = `${controlClass} size-6 border-base-300 shadow-none checked:border-primary`;
      input.addEventListener('change', () => {
        if (isRetail) toggleYear(state, year);
        else state.paymentYear = year;
        onChange();
      });

      label.append(input, createElement('span', year));
      fieldset.append(label);
    }
  }
}

function createSwatch(color, fill) {
  const swatch = createElement('span', undefined, 'legend-swatch');
  swatch.style.setProperty('--swatch', color);
  swatch.style.setProperty('--swatch-fill', fill);
  swatch.setAttribute('aria-hidden', 'true');
  return swatch;
}

function createLegends(years, state, onChange) {
  const retailLegend = document.getElementById('retail-legend');
  years.forEach((year, index) => {
    const color = YEAR_COLORS[index % YEAR_COLORS.length];
    const button = createElement('button', undefined, 'legend-item');
    button.type = 'button';
    button.dataset.year = year;
    button.setAttribute('aria-label', `Показать или скрыть ${year} год`);
    button.append(createSwatch(color, color + '18'), createElement('span', year));
    button.addEventListener('click', () => {
      toggleYear(state, year);
      onChange();
    });
    retailLegend.append(button);
  });

  const paymentLegend = document.getElementById('payment-legend');
  for (const { label, color, fill } of [...PAYMENT_SERIES].reverse()) {
    const item = createElement('span', undefined, 'legend-item');
    item.append(createSwatch(color, fill), createElement('span', label));
    paymentLegend.append(item);
  }
}

function bindMetricTabs(state, onChange) {
  const tabs = [...document.querySelectorAll('[data-metric]')];

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      state.metric = tab.dataset.metric;
      onChange();
    });
    tab.addEventListener('keydown', (event) => {
      let nextIndex;
      switch (event.key) {
        case 'ArrowLeft':
          nextIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'ArrowRight':
          nextIndex = (index + 1) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    });
  });
}

export function initControls(data, state, onChange) {
  const years = data.series.map((series) => series.year);
  createYearControls(years, state, onChange);
  createLegends(years, state, onChange);
  bindMetricTabs(state, onChange);

  for (const section of document.querySelectorAll('[data-chart]')) {
    section
      .querySelector('.chart-card')
      .prepend(createElement('p', undefined, 'print-context hidden'));
  }
}

export function updateControls(state) {
  document.querySelectorAll('#retail-years input').forEach((input) => {
    input.checked = state.retailYears.has(Number(input.value));
  });
  document.querySelectorAll('#payment-years input').forEach((input) => {
    input.checked = state.paymentYear === Number(input.value);
  });
  document.querySelectorAll('#retail-legend [data-year]').forEach((button) => {
    button.setAttribute('aria-pressed', String(state.retailYears.has(Number(button.dataset.year))));
  });
  document.querySelectorAll('[data-metric]').forEach((tab) => {
    const selected = tab.dataset.metric === state.metric;
    tab.classList.toggle('tab-active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) document.getElementById('retail-panel').setAttribute('aria-labelledby', tab.id);
  });

  const years = [...state.retailYears].sort((a, b) => a - b).join(', ');
  document.querySelector('#retail .print-context').textContent =
    `${METRICS[state.metric]} · Годы: ${years}`;
  document.querySelector('#payments .print-context').textContent = `Год: ${state.paymentYear}`;
}
