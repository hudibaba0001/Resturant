import { z } from 'zod';

export const ChatRequestSchema = z.object({
  restaurantId: z.string().uuid(),
  sessionToken: z.string().min(3).max(120),
  message: z.string().min(1).max(450),
  locale: z.string().optional(),
});

export const ChatReplySchema = z.object({
  reply: z.object({
    text: z.string().min(1).max(450),
    context: z.string().optional(),
    chips: z.array(z.string()).max(4).optional(),
    locale: z.string().optional(),
  }),
  cards: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    price_cents: z.number().int().nonnegative().optional(),
    currency: z.string().optional(),
    allergens: z.array(z.string()).optional(),
  })).max(3),
});
export type ChatReply = z.infer<typeof ChatReplySchema>;

export const MenuResponseSchema = z.object({
  sections: z.array(z.object({
    name: z.string(),
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
      price_cents: z.number().int().nonnegative().optional(),
      currency: z.string().optional(),
      allergens: z.array(z.string()).optional(),
    })),
  })),
});

// Legacy schemas for backward compatibility
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

export const MenuSection = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(MenuItem),
});

export const MenuResponse = z.object({
  sections: z.array(MenuSection),
  restaurant: z.object({
    id: z.string(),
    name: z.string(),
    is_open: z.boolean(),
  }),
});

export const OrderItem = z.object({
  id: z.string(),
  name: z.string(),
  price_cents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

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
export type ChatReplyType = z.infer<typeof ChatReplySchema>;
export type OrderType = z.infer<typeof Order>;
export type HealthResponseType = z.infer<typeof HealthResponse>;
