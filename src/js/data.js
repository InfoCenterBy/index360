import { calendarWeeks } from './calendar.js';

const VALUE_FIELDS = ['receiptIndex', 'salesIndex', 'cashShare', 'cashlessShare'];

export async function loadData(url) {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Не указан адрес JSON в DATA_URL.');
  }
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return validateData(await response.json());
}

function validatePaymentShares(point) {
  const { cashShare, cashlessShare } = point;
  if ((cashShare === null) !== (cashlessShare === null)) {
    throw new Error('Обе доли оплаты должны быть заполнены или обе равны null.');
  }
  if (cashShare === null) return;

  const outOfRange = cashShare < 0 || cashShare > 100 || cashlessShare < 0 || cashlessShare > 100;
  const invalidTotal = Math.abs(cashShare + cashlessShare - 100) > 0.001;
  if (outOfRange || invalidTotal) {
    throw new Error('Доли форм оплаты должны быть от 0 до 100 и в сумме равняться 100.');
  }
}

function validateWeek(point, year, calendar, seenWeeks) {
  const expected = calendar[point?.week - 1];
  const validWeek = Number.isInteger(point?.week) && expected && !seenWeeks.has(point.week);
  const validDates =
    expected && point?.startDate === expected.startDate && point?.endDate === expected.endDate;
  if (!validWeek || !validDates) {
    throw new Error(`Некорректная или повторяющаяся неделя: ${year}/${point?.week}.`);
  }

  const result = { ...expected };
  for (const key of VALUE_FIELDS) {
    const value = point[key];
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error(`Некорректное значение ${key}: ${year}/${point.week}.`);
    }
    result[key] = value;
  }
  validatePaymentShares(result);
  seenWeeks.add(point.week);
  return result;
}

function validateYear(entry, seenYears) {
  const validYear = Number.isInteger(entry?.year) && entry.year >= 1900 && entry.year <= 2200;
  if (!validYear || seenYears.has(entry.year) || !Array.isArray(entry.weeks)) {
    throw new Error('Некорректный или повторяющийся год.');
  }

  const calendar = calendarWeeks(entry.year);
  const seenWeeks = new Set();
  const weeks = entry.weeks
    .map((point) => validateWeek(point, entry.year, calendar, seenWeeks))
    .sort((a, b) => a.week - b.week);
  seenYears.add(entry.year);
  return { year: entry.year, weeks };
}

export function validateData(input) {
  if (input?.schemaVersion !== 1 || !Array.isArray(input.series) || input.series.length === 0) {
    throw new Error('Ожидаются schemaVersion: 1 и непустой массив series.');
  }

  const seenYears = new Set();
  const series = input.series
    .map((entry) => validateYear(entry, seenYears))
    .sort((a, b) => a.year - b.year);
  return { schemaVersion: 1, series };
}
