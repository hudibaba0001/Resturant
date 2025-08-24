import { describe, it, expect } from 'vitest';

const total = (cart: { price_cents: number; quantity: number }[]) =>
  cart.reduce((s, i) => s + i.price_cents * i.quantity, 0);

describe('cart math', () => {
  it('sums precisely in cents', () => {
    expect(
      total([
        { price_cents: 9900, quantity: 1 },
        { price_cents: 4500, quantity: 3 },
      ]),
    ).toBe(9900 + 4500 * 3);
  });
});
