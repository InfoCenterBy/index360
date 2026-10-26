import { METRICS, YEAR_COLORS, PAYMENT_SERIES } from './config.js';
import { calendarWeeks, weekLabel, weekDateRange, MONTHS } from './calendar.js';
import { indexFormat, shareFormat } from './format.js';
import { renderTooltip } from './chart-interactions.js';

function createMonthAxis(year, mobile) {
  const calendar = calendarWeeks(year);
  const positions = new Map();
  let previousMonth = -1;

  calendar.forEach((point, index) => {
    const thursday = new Date(point.startDate + 'T00:00:00Z');
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const month = thursday.getUTCMonth();
    if (month !== previousMonth) positions.set(index, MONTHS[month]);
    previousMonth = month;
  });

  return {
    type: 'linear',
    min: 0,
    max: calendar.length - 1,
    afterBuildTicks: (axis) => {
      axis.ticks = [...positions.keys()].map((value) => ({ value }));
    },
    ticks: {
      autoSkip: false,
      maxRotation: 0,
      font: { size: mobile ? 10 : 12 },
      callback: (value) => positions.get(value) || '',
    },
    grid: { color: '#d1d5db', tickLength: 12 },
    border: { color: '#d1d5db' },
  };
}

function createOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    locale: 'ru-RU',
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: renderTooltip,
        backgroundColor: 'rgba(31,41,55,0.92)',
        padding: 10,
        cornerRadius: 4,
        titleFont: { size: 13, weight: '500' },
        bodyFont: { size: 13 },
        displayColors: true,
      },
    },
  };
}

export function createCharts() {
  const Chart = window.Chart;
  if (!Chart) throw new Error('Библиотека графиков не загрузилась.');
  Chart.defaults.font.family = 'Roboto, Arial, sans-serif';
  Chart.defaults.color = '#6b7280';

  return {
    retail: new Chart(document.getElementById('retail-chart'), {
      type: 'line',
      data: { datasets: [] },
      options: createOptions(),
    }),
    payments: new Chart(document.getElementById('payment-chart'), {
      type: 'bar',
      data: { datasets: [] },
      options: createOptions(),
    }),
  };
}

function weeklyPoints(series, key) {
  const values = new Map(series.weeks.map((point) => [point.week, point]));
  return calendarWeeks(series.year).map((week) => ({
    x: week.week - 1,
    y: values.get(week.week)?.[key] ?? null,
    point: values.get(week.week) ?? week,
  }));
}

function updateRetailChart(chart, data, state, mobile) {
  chart.data.datasets = data.series
    .filter((series) => state.retailYears.has(series.year))
    .map((series) => {
      const color = YEAR_COLORS[data.series.indexOf(series) % YEAR_COLORS.length];
      return {
        label: String(series.year),
        data: weeklyPoints(series, state.metric),
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 12,
        tension: 0.35,
        spanGaps: false,
      };
    });

  const referenceYear = Math.max(...data.series.map((series) => series.year));
  chart.options.scales = {
    x: createMonthAxis(referenceYear, mobile),
    y: {
      suggestedMin: -0.3,
      suggestedMax: 0.2,
      ticks: { stepSize: 0.1, font: { size: 12 }, callback: (value) => indexFormat.format(value) },
      grid: { color: '#d1d5db' },
      border: { color: '#d1d5db' },
    },
  };
  chart.options.plugins.tooltip.callbacks = {
    title: (items) => (items.length ? `Неделя ${items[0].raw.point.week}` : ''),
    label: (item) =>
      `${item.dataset.label} (${weekDateRange(item.raw.point)}) · ${METRICS[state.metric]}: ${indexFormat.format(item.parsed.y)}`,
  };
}

function updatePaymentChart(chart, data, state, mobile) {
  const series = data.series.find((series) => series.year === state.paymentYear);
  chart.data.datasets = PAYMENT_SERIES.map(({ key, label, color, fill }) => ({
    label,
    data: weeklyPoints(series, key),
    stack: 'payments',
    backgroundColor: fill,
    borderColor: color,
    borderWidth: 2,
    // Explicit corners also round the lower segment of a stacked bar.
    borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8 },
    borderSkipped: false,
    barPercentage: 0.85,
    categoryPercentage: 1,
    maxBarThickness: 27,
  }));
  chart.options.scales = {
    x: {
      ...createMonthAxis(state.paymentYear, mobile),
      stacked: true,
      min: -0.5,
      max: calendarWeeks(state.paymentYear).length - 0.5,
      offset: false,
    },
    y: {
      stacked: true,
      min: 0,
      max: 100,
      ticks: { stepSize: 20, font: { size: 12 }, callback: (value) => value },
      grid: { color: '#eef0f3' },
      border: { display: false },
    },
  };
  chart.options.plugins.tooltip.callbacks = {
    title: (items) => (items.length ? weekLabel(items[0].raw.point) : ''),
    label: (item) => `${item.dataset.label}: ${shareFormat.format(item.parsed.y)}%`,
  };
}

export function hasChartValues(chart) {
  return chart.data.datasets.some((dataset) => dataset.data.some((point) => point.y != null));
}

function updateEmptyState(kind, chart) {
  const section = document.getElementById(kind);
  const hasValues = hasChartValues(chart);
  section.querySelector('.chart-scroll').hidden = !hasValues;
  let message = section.querySelector('.empty-state');
  if (!message) {
    message = document.createElement('p');
    message.className = 'empty-state';
    section.querySelector('.chart-scroll').after(message);
  }
  message.hidden = hasValues;
  message.textContent =
    kind === 'retail' && chart.data.datasets.length === 0
      ? 'Выберите хотя бы один год для отображения графика.'
      : 'За выбранный период пока нет данных.';
}

export function updateCharts(charts, data, state, mobile) {
  updateRetailChart(charts.retail, data, state, mobile);
  updatePaymentChart(charts.payments, data, state, mobile);

  for (const [kind, chart] of Object.entries(charts)) {
    // Keep weekly labels readable and let phones scroll horizontally.
    chart.canvas.parentElement.style.minWidth = mobile ? '1060px' : '';
    updateEmptyState(kind, chart);
    chart.setActiveElements([]);
    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    chart.resize();
    chart.update('none');
  }
}
