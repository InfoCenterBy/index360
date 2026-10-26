import { METRICS } from './config.js';

let pdfLibrary;
function loadPdfLibrary() {
  if (!pdfLibrary) {
    pdfLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./vendor/jspdf.umd.min.js', import.meta.url).href;
      script.onload = () => {
        if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
        else {
          script.remove();
          pdfLibrary = null;
          reject(new Error('Библиотека PDF недоступна.'));
        }
      };
      script.onerror = () => {
        script.remove();
        pdfLibrary = null;
        reject(new Error('Не удалось загрузить библиотеку PDF. Повторите попытку.'));
      };
      document.head.append(script);
    });
  }
  return pdfLibrary;
}

function cloneChartConfig(value) {
  // Chart options contain callbacks, which JSON serialization would remove.
  if (Array.isArray(value)) return value.map(cloneChartConfig);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneChartConfig(item)]),
    );
  return value;
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? line + ' ' + word : word;
    if (context.measureText(next).width > maxWidth && line) {
      context.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else line = next;
  }
  if (line) {
    context.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

const REPORT_WIDTH = 2000;
const REPORT_PADDING = 72;
const CHART_HEIGHT = 490;

function drawHeader(context, section, state) {
  const textWidth = REPORT_WIDTH - REPORT_PADDING * 2;
  context.fillStyle = '#5e60ce';
  context.font = '600 36px "Exo 2", sans-serif';
  context.fillText('СПЕЦИАЛЬНЫЙ ПРОЕКТ · ИНДЕКС 360°', REPORT_PADDING, 60);
  context.fillStyle = '#1f2937';
  context.font = '600 46px "Exo 2", sans-serif';
  const title = section.querySelector('h2').textContent.toUpperCase();
  let y = drawWrappedText(context, title, REPORT_PADDING, 128, textWidth, 58) + 20;

  context.font = '400 28px Roboto, sans-serif';
  const isRetail = section.dataset.chart === 'retail';
  if (isRetail)
    y = drawWrappedText(context, METRICS[state.metric], REPORT_PADDING, y, textWidth, 38) + 12;
  const years = isRetail
    ? [...state.retailYears].sort((a, b) => a - b).join(', ')
    : state.paymentYear;
  context.fillText('Год: ' + years, REPORT_PADDING, y);
  y += 56;

  context.fillStyle = '#4b5563';
  context.font = '400 24px Roboto, sans-serif';
  const description = section.querySelector('.chart-notice p').textContent;
  return drawWrappedText(context, description, REPORT_PADDING, y, textWidth, 33) + 32;
}

function drawChart(context, config, y) {
  const canvas = document.createElement('canvas');
  canvas.width = REPORT_WIDTH - REPORT_PADDING * 2;
  canvas.height = CHART_HEIGHT;
  const { options, data } = config;
  options.responsive = false;
  options.maintainAspectRatio = false;
  options.devicePixelRatio = 2;
  options.animation = false;
  options.plugins.tooltip.enabled = false;
  options.plugins.legend.display = false;
  for (const scale of Object.values(options.scales)) {
    scale.ticks = { ...scale.ticks, font: { ...scale.ticks?.font, size: 24 } };
  }
  for (const dataset of data.datasets) {
    dataset.borderWidth = 3;
    if (config.type === 'bar') dataset.maxBarThickness = 36;
  }

  let exportChart;
  try {
    exportChart = new window.Chart(canvas, config);
    exportChart.update('none');
    context.drawImage(canvas, REPORT_PADDING, y, REPORT_WIDTH - REPORT_PADDING * 2, CHART_HEIGHT);
  } finally {
    exportChart?.destroy();
  }
  return y + CHART_HEIGHT + 40;
}

function drawLegend(context, datasets, y) {
  context.font = '400 26px Roboto, sans-serif';
  let x = REPORT_PADDING;
  for (const dataset of datasets) {
    const itemWidth = context.measureText(dataset.label).width + 120;
    if (x + itemWidth > REPORT_WIDTH - REPORT_PADDING) {
      y += 50;
      x = REPORT_PADDING;
    }
    context.fillStyle = dataset.backgroundColor;
    context.strokeStyle = dataset.borderColor;
    context.lineWidth = 2;
    context.fillRect(x, y, 56, 28);
    context.strokeRect(x, y, 56, 28);
    context.fillStyle = '#6b7280';
    context.fillText(dataset.label, x + 72, y);
    x += itemWidth;
  }
  return y + 76;
}

function drawFooter(context, y) {
  context.fillStyle = '#6b7280';
  context.font = '400 24px Roboto, sans-serif';
  context.fillText(
    'Республиканское унитарное предприятие «Информационно-издательский центр по налогам и сборам»',
    REPORT_PADDING,
    y,
  );
  return y + 60;
}

export async function createReportImage(chart, section, state) {
  // Copy before awaiting so a filter change cannot alter the report being prepared.
  const config = {
    type: chart.config.type,
    data: cloneChartConfig(chart.data),
    options: cloneChartConfig(chart.config.options),
  };
  await document.fonts.ready;

  const report = document.createElement('canvas');
  report.width = REPORT_WIDTH;
  report.height = 1600;
  const context = report.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, report.width, report.height);
  context.textBaseline = 'top';

  let y = drawHeader(context, section, state);
  y = drawChart(context, config, y);
  const legend =
    section.dataset.chart === 'retail' ? config.data.datasets : [...config.data.datasets].reverse();
  y = drawLegend(context, legend, y);
  const height = drawFooter(context, y);

  const result = document.createElement('canvas');
  result.width = report.width;
  result.height = height;
  result.getContext('2d').drawImage(report, 0, 0);
  return result;
}

export async function downloadPdf(chart, section, state) {
  const [jsPDF, image] = await Promise.all([
    loadPdfLibrary(),
    createReportImage(chart, section, state),
  ]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: section.querySelector('h2').textContent,
    subject: 'Индекс 360°',
    creator: 'Индекс 360°',
  });
  const maxWidth = 277;
  const maxHeight = 190;
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  pdf.addImage(
    image,
    'PNG',
    (297 - width) / 2,
    (210 - height) / 2,
    width,
    height,
    undefined,
    'FAST',
  );
  pdf.save(`index360-${section.dataset.chart}.pdf`);
}
