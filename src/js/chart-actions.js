import { downloadCsv } from './csv.js';
import { hasChartValues } from './charts.js';
import { downloadPdf } from './pdf.js';
import { announce, showError } from './dom.js';

export function updateActionButtons(charts) {
  for (const section of document.querySelectorAll('[data-chart]')) {
    const disabled = !hasChartValues(charts[section.dataset.chart]);
    section.querySelectorAll('[data-export], [data-print]').forEach((button) => {
      button.disabled = disabled;
    });
  }
}

function bindDownloads(section, chart, data, state) {
  const dropdown = section.querySelector('.export-dropdown');
  const summary = dropdown.querySelector('summary');

  section.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (summary.hasAttribute('aria-busy')) return;
      dropdown.open = false;
      summary.setAttribute('aria-busy', 'true');
      button.disabled = true;

      try {
        // Keep the selected filters stable while the PDF library is loading.
        const snapshot = { ...state, retailYears: new Set(state.retailYears) };
        if (button.dataset.export === 'pdf') await downloadPdf(chart, section, snapshot);
        else downloadCsv(data, snapshot, section.dataset.chart);
        announce('Файл подготовлен для скачивания.');
      } catch (error) {
        console.error(error);
        showError('Не удалось скачать файл. Повторите попытку.');
      } finally {
        summary.removeAttribute('aria-busy');
        button.disabled = !hasChartValues(chart);
        summary.focus();
      }
    });
  });
}

function bindPrinting(charts) {
  document.querySelectorAll('[data-print]').forEach((button) => {
    button.addEventListener('click', () => {
      document.body.dataset.printChart = button.closest('[data-chart]').dataset.chart;
      window.print();
    });
  });
  window.addEventListener('beforeprint', () => {
    Object.values(charts).forEach((chart) => chart.resize(1000, 300));
  });
  window.addEventListener('afterprint', () => {
    delete document.body.dataset.printChart;
    Object.values(charts).forEach((chart) => chart.resize());
  });
}

function bindDropdowns() {
  document.addEventListener('click', (event) => {
    document.querySelectorAll('.export-dropdown[open]').forEach((dropdown) => {
      if (!dropdown.contains(event.target)) dropdown.open = false;
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.export-dropdown[open]').forEach((dropdown) => {
      dropdown.open = false;
      dropdown.querySelector('summary').focus();
    });
  });
}

export function initChartActions(charts, data, state) {
  for (const section of document.querySelectorAll('[data-chart]')) {
    bindDownloads(section, charts[section.dataset.chart], data, state);
  }
  bindPrinting(charts);
  bindDropdowns();
}
