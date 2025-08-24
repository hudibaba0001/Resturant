import { describe, it, expect } from 'vitest';

function formatPrice(item: any) {
  const currency = item?.currency || 'SEK';
  const cents = item?.price_cents ?? Math.round((item?.price || 0) * 100);
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(
    cents / 100,
  );
}

describe('formatPrice', () => {
  it('handles undefined safely', () => {
    const result = formatPrice(undefined);
    expect(result).toContain('0,00'); // Check the number
    expect(result).toContain('kr'); // Check the currency
  });
  it('uses currency when provided', () => {
    const result = formatPrice({ price_cents: 12345, currency: 'EUR' });
    expect(result).toMatch(/123[,.]45/); // Just check the number format
    expect(result).toContain('€'); // Check currency symbol
  });
});
