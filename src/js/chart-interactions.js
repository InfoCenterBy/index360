import { weekLabel } from './calendar.js';
import { indexFormat } from './format.js';
import { announce } from './dom.js';

export function renderTooltip({ chart, tooltip }) {
  const card = chart.canvas.closest('.chart-card');
  if (!card) return;
  let box = card.querySelector('.chart-tooltip');
  if (!box) {
    box = document.createElement('div');
    box.className = 'chart-tooltip';
    box.setAttribute('aria-hidden', 'true');
    card.append(box);
  }
  box.hidden = !tooltip.opacity;
  if (!tooltip.opacity) return;
  const content = [];
  for (const title of tooltip.title || []) {
    const heading = document.createElement('strong');
    heading.textContent = title;
    content.push(heading);
  }
  (tooltip.body || []).forEach((body, index) => {
    const row = document.createElement('p');
    const swatch = document.createElement('span');
    swatch.className = 'tooltip-swatch';
    swatch.style.backgroundColor = tooltip.labelColors[index]?.borderColor || '#fff';
    row.append(
      swatch,
      document.createTextNode([...body.before, ...body.lines, ...body.after].join(' ')),
    );
    content.push(row);
  });
  box.replaceChildren(...content);
  const bounds = card.getBoundingClientRect();
  const canvas = chart.canvas.getBoundingClientRect();
  const left = canvas.left - bounds.left + tooltip.caretX - box.offsetWidth / 2;
  const top = canvas.top - bounds.top + tooltip.caretY - box.offsetHeight - 16;
  box.style.left = Math.max(12, Math.min(bounds.width - box.offsetWidth - 12, left)) + 'px';
  box.style.top = Math.max(12, Math.min(bounds.height - box.offsetHeight - 12, top)) + 'px';
}

export function initChartInteractions(chart) {
  let current = -1;
  let keyboardScroll = false;
  function dismiss() {
    chart.setActiveElements([]);
    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    chart.update('none');
  }
  chart.canvas.closest('.chart-scroll').addEventListener(
    'scroll',
    () => {
      if (keyboardScroll) {
        keyboardScroll = false;
        renderTooltip({ chart, tooltip: chart.tooltip });
      } else dismiss();
    },
    { passive: true },
  );
  document.addEventListener('pointerdown', (event) => {
    if (event.target !== chart.canvas) dismiss();
  });
  chart.canvas.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') {
      dismiss();
      return;
    }
    const count = Math.max(0, ...chart.data.datasets.map((dataset) => dataset.data.length));
    if (!count) return;
    if (event.key === 'Home') current = 0;
    else if (event.key === 'End') current = count - 1;
    else
      current = Math.max(0, Math.min(count - 1, current + (event.key === 'ArrowRight' ? 1 : -1)));
    const elements = chart.data.datasets.flatMap((dataset, datasetIndex) =>
      dataset.data[current]?.y == null ? [] : [{ datasetIndex, index: current }],
    );
    const point = elements.length
      ? chart.getDatasetMeta(elements[0].datasetIndex).data[current]
      : null;
    chart.setActiveElements(elements);
    chart.tooltip.setActiveElements(elements, point ? { x: point.x, y: point.y } : { x: 0, y: 0 });
    chart.update('none');
    if (point) {
      const container = chart.canvas.closest('.chart-scroll');
      const left = Math.max(
        0,
        Math.min(
          container.scrollWidth - container.clientWidth,
          point.x - container.clientWidth / 2,
        ),
      );
      if (Math.abs(container.scrollLeft - left) > 1) {
        keyboardScroll = true;
        container.scrollLeft = left;
      }
    }
    announce(
      elements
        .map(({ datasetIndex }) => {
          const dataset = chart.data.datasets[datasetIndex];
          const raw = dataset.data[current];
          return `${dataset.label}. ${weekLabel(raw.point)}. ${indexFormat.format(raw.y)}`;
        })
        .join('. ') || 'Нет данных за эту неделю.',
    );
  });
}
