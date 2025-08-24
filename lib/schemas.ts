import { z } from 'zod';

// Menu item schema
export const MenuItem = z.object({
  id: z.string(),
  name: z.string(),
  price_cents: z.number().int().nonnegative(),
  currency: z.string().default('SEK'),
  description: z.string().optional(),
  allergens: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  is_available: z.boolean().default(true),
});

// Menu section schema
export const MenuSection = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(MenuItem),
});

// Menu response schema
export const MenuResponse = z.object({
  sections: z.array(MenuSection),
  restaurant: z.object({
    id: z.string(),
    name: z.string(),
    is_open: z.boolean(),
  }),
});

// Chat reply schema
export const ChatReply = z.object({
  reply: z.object({
    text: z.string().min(1).max(450),
    context: z.string().optional(),
    chips: z.array(z.string()).max(5).optional(),
    locale: z.string().optional(),
  }),
  cards: z.array(MenuItem).max(3),
});

// Order item schema
export const OrderItem = z.object({
  id: z.string(),
  name: z.string(),
  price_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

// Order schema
export const Order = z.object({
  id: z.string(),
  restaurant_id: z.string(),
  items: z.array(OrderItem),
  total_cents: z.number().int().nonnegative(),
  status: z.enum(['pending', 'paid', 'cancelled', 'completed']),
  customer_email: z.string().email().optional(),
  customer_name: z.string().optional(),
  created_at: z.string().datetime(),
});

// Health check response
export const HealthResponse = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  version: z.string(),
  environment: z.string(),
  services: z.object({
    database: z.boolean(),
    ai: z.boolean().optional(),
  }),
});

// Export types
export type MenuItemType = z.infer<typeof MenuItem>;
export type MenuSectionType = z.infer<typeof MenuSection>;
export type MenuResponseType = z.infer<typeof MenuResponse>;
export type ChatReplyType = z.infer<typeof ChatReply>;
export type OrderType = z.infer<typeof Order>;
export type HealthResponseType = z.infer<typeof HealthResponse>;
