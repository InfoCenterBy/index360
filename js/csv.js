import { calendarWeeks } from './calendar.js';
import { METRICS } from './config.js';
import { indexFormat, shareFormat } from './format.js';

function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Quoting alone does not stop spreadsheet programs from interpreting formulas.
  const startsFormula = /^[=+@\t\r]/.test(text) || /^-(?!\d+(?:[.,]\d+)?$)/.test(text);
  if (startsFormula) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function toCsv(rows) {
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}

function rowsForYear(series, keys, format) {
  const values = new Map(series.weeks.map((week) => [week.week, week]));
  return calendarWeeks(series.year).map((week) => [
    series.year,
    week.week,
    week.startDate,
    week.endDate,
    ...keys.map((key) => {
      const value = values.get(week.week)?.[key];
      return value == null ? 'Нет данных' : format.format(value);
    }),
  ]);
}

function exportRows(data, state, kind) {
  if (kind === 'retail') {
    const selected = data.series.filter((series) => state.retailYears.has(series.year));
    return [
      ['Год', 'Неделя', 'Начало недели', 'Конец недели', METRICS[state.metric]],
      ...selected.flatMap((series) => rowsForYear(series, [state.metric], indexFormat)),
    ];
  }

  const series = data.series.find((series) => series.year === state.paymentYear);
  return [
    ['Год', 'Неделя', 'Начало недели', 'Конец недели', 'Доля наличных, %', 'Доля безналичных, %'],
    ...rowsForYear(series, ['cashShare', 'cashlessShare'], shareFormat),
  ];
}

export function downloadCsv(data, state, kind) {
  const content = toCsv(exportRows(data, state, kind));
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `index360-${kind}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
