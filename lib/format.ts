// Utility functions for formatting (MVP-safe, no i18n overkill)

export function formatMoney(cents: number, currency = 'SEK') {
  const value = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
