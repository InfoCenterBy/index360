# Данные графиков

```json
{
  "schemaVersion": 1,
  "series": [
    {
      "year": 2026,
      "weeks": [
        {
          "week": 1,
          "startDate": "2025-12-29",
          "endDate": "2026-01-04",
          "receiptIndex": 0.072,
          "salesIndex": 0.093,
          "cashShare": 39,
          "cashlessShare": 61
        }
      ]
    }
  ]
}
```

| Поле                   | Значение                              |
| ---------------------- | ------------------------------------- |
| `schemaVersion`        | Версия: `1`                           |
| `year`, `week`         | Год и неделя ISO                      |
| `startDate`, `endDate` | Понедельник–воскресенье, `YYYY-MM-DD` |
| `receiptIndex`         | Индекс количества чеков               |
| `salesIndex`           | Индекс суммы продаж                   |
| `cashShare`            | Доля наличных, %                      |
| `cashlessShare`        | Доля безналичных, %                   |

- Доли: 0–100, сумма 100.
- Пропуски: `null`; доли — парой.
- Годы и недели: без повторов.
- Пример: `src/data/weekly.json`.
- Адрес: `DATA_URL` в `src/js/config.js`.
