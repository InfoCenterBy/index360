// Replace with the server endpoint when the backend is available.
export const DATA_URL = 'data/weekly.json';

export const MOBILE_QUERY = '(max-width: 767px)';

export const METRICS = {
  receiptIndex: 'Индекс розничного бизнеса (кол-во чеков)',
  salesIndex: 'Индекс розничного бизнеса (по сумме продаж)',
};

export const YEAR_COLORS = ['#858b98', '#ff4646', '#4879ff', '#20b856', '#ffbe69', '#7772ff'];

export const PAYMENT_SERIES = [
  { key: 'cashlessShare', label: 'Доля безналичных', color: '#ffbe69', fill: '#fff8ee' },
  { key: 'cashShare', label: 'Доля наличных', color: '#7772ff', fill: '#d6d6ff' },
];
