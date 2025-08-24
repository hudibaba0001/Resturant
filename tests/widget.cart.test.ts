import { describe, it, expect } from 'vitest';

function totalCents(cart: { price_cents: number; quantity: number }[]) {
  return cart.reduce((s, i) => s + i.price_cents * i.quantity, 0);
}

describe('cart totals', () => {
  it('sums quantities accurately', () => {
    const cart = [
      { price_cents: 9900, quantity: 1 },
      { price_cents: 8900, quantity: 2 },
    ];
    expect(totalCents(cart)).toBe(9900 + 8900 * 2);
  });
});
