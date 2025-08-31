import { describe, it, expect } from 'vitest';
import { CreateOrderSchema } from '@/app/api/orders/validation';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('CreateOrderSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = CreateOrderSchema.parse({
      restaurantId: UUID,
      sessionToken: 'abcdefghijklmnopqrstuvwxyz012345',
      type: 'pickup',
      items: [{ itemId: UUID, qty: 1 }],
    });
    expect(parsed.type).toBe('pickup');
  });

  it('rejects non-UUID itemId', () => {
    const res = CreateOrderSchema.safeParse({
      restaurantId: UUID,
      sessionToken: 'abcdefghijklmnopqrstuvwxyz012345',
      type: 'pickup',
      items: [{ itemId: '2', qty: 1 }],
    });
    expect(res.success).toBe(false);
  });

  it('requires at least 1 item', () => {
    const res = CreateOrderSchema.safeParse({
      restaurantId: UUID,
      sessionToken: 'abcdefghijklmnopqrstuvwxyz012345',
      type: 'dine_in',
      items: [],
    });
    expect(res.success).toBe(false);
  });
});
