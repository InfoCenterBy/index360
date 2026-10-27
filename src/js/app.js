import { DATA_URL, METRICS, MOBILE_QUERY } from './config.js';
import { loadData } from './data.js';
import { createCharts, updateCharts } from './charts.js';
import { initChartInteractions } from './chart-interactions.js';
import { initControls, updateControls } from './controls.js';
import { initChartActions, updateActionButtons } from './chart-actions.js';
import { initPreferences } from './preferences.js';
import { announce, showError } from './dom.js';

function createState(data, saved) {
  const years = data.series.map((series) => series.year);
  const selectedYears = Array.isArray(saved?.retailYears)
    ? saved.retailYears.filter((year) => years.includes(year))
    : years.slice(0, 2);

  return {
    metric: Object.hasOwn(METRICS, saved?.metric) ? saved.metric : 'receiptIndex',
    retailYears: new Set(selectedYears),
    paymentYear: years.includes(saved?.paymentYear) ? saved.paymentYear : years.at(-1),
  };
}

function describeSelection(state) {
  const years = [...state.retailYears].sort((a, b) => a - b).join(', ') || 'не выбраны';
  return `Графики обновлены. ${METRICS[state.metric]}. Годы: ${years}. Формы оплаты: ${state.paymentYear} год.`;
}

async function init() {
  const preferences = initPreferences();
  // The 404 page shares the dialogs but has no charts or data request.
  if (!document.getElementById('retail-chart')) return;

  const status = document.getElementById('data-status');
  const actionButtons = document.querySelectorAll('[data-export], [data-print]');
  actionButtons.forEach((button) => {
    button.disabled = true;
  });

  try {
    const data = await loadData(DATA_URL);
    await document.fonts.ready;

    const state = createState(data, preferences.readChartPreferences());
    const charts = createCharts();
    const mobile = matchMedia(MOBILE_QUERY);
    let initialized = false;

    function update() {
      updateCharts(charts, data, state, mobile.matches);
      updateControls(state);
      updateActionButtons(charts);
      preferences.saveChartPreferences(state);
      if (initialized) announce(describeSelection(state));
      initialized = true;
    }

    initControls(data, state, update);
    initChartActions(charts, data, state);
    update();
    Object.values(charts).forEach(initChartInteractions);
    mobile.addEventListener('change', update);

    status.hidden = true;
    status.textContent = '';
    document.documentElement.dataset.ready = 'true';
  } catch (error) {
    console.error(error);
    showError('Не удалось загрузить данные графиков. Попробуйте обновить страницу.');
    actionButtons.forEach((button) => {
      button.disabled = true;
    });
    document.querySelectorAll('.chart-scroll').forEach((chart) => {
      chart.hidden = true;
    });
  } finally {
    document.querySelectorAll('[data-chart-loader]').forEach((loader) => {
      loader.hidden = true;
    });
    document.querySelectorAll('[data-chart-region]').forEach((region) => {
      region.setAttribute('aria-busy', 'false');
    });
  }
}

init();
