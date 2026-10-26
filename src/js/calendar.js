const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;

export const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

function firstMonday(year) {
  // ISO week 1 is the week containing January 4.
  const date = new Date(Date.UTC(year, 0, 4));
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.getTime();
}

export function calendarWeeks(year) {
  const firstWeek = firstMonday(year);
  const nextYear = firstMonday(year + 1);
  const weeks = [];

  for (let start = firstWeek, week = 1; start < nextYear; start += WEEK_IN_MS, week++) {
    weeks.push({
      week,
      startDate: new Date(start).toISOString().slice(0, 10),
      endDate: new Date(start + 6 * DAY_IN_MS).toISOString().slice(0, 10),
    });
  }

  return weeks;
}

export function weekDateRange(point) {
  const formatDate = (value) => `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(2, 4)}`;
  return `${formatDate(point.startDate)}–${formatDate(point.endDate)}`;
}

export function weekLabel(point) {
  return `Неделя ${point.week}: ${weekDateRange(point)}`;
}
