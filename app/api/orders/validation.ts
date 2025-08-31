import { z } from 'zod';

// Extracted so we can unit-test validation independently (improves coverage).
// Audit: inconsistent error handling + low test coverage. This is a safe step. 
// (We are NOT wiring it into the route yet to avoid behavior changes.)
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const OrderItemSchema = z.object({
  itemId: z.string().regex(UUID, 'INVALID_ITEM_ID'),
  qty: z.number().int().positive(),
  selections: z.any().optional(), // keep loose; DB already enforces shape if present
});

export const CreateOrderSchema = z.object({
  restaurantId: z.string().regex(UUID, 'INVALID_RESTAURANT_ID'),
  sessionId: z.string().regex(UUID, 'INVALID_SESSION_ID').optional(),
  sessionToken: z.string().min(24).optional(),
  type: z.enum(['pickup', 'dine_in']), // normalized enum
  items: z.array(OrderItemSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
