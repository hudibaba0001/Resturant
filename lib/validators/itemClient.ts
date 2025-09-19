import { z } from "zod";

export const tagSchema = z
  .string()
  .min(1)
  .max(24)
  .regex(/^[a-z0-9 _-]+$/i);

const variantChoice = z.object({
  name: z.string().min(1).max(80),
  price_delta_cents: z.number().int().min(0).optional(),
  sku: z.string().max(64).optional(),
  is_default: z.boolean().optional(),
});

const variantGroup = z.object({
  name: z.string().min(1).max(80),
  choices: z.array(variantChoice).max(20),
});

const modifierChoice = z.object({
  name: z.string().min(1).max(80),
  price_cents: z.number().int().min(0).optional(),
});

const modifierGroup = z.object({
  group: z.string().min(1).max(80),
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(0).optional(),
  required: z.boolean().optional(),
  choices: z.array(modifierChoice).max(20),
});

export const itemClientSchema = z.object({
  restaurantId: z.string().uuid(),
  menu: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  price_cents: z.number().int().min(0),
  currency: z.string().length(3),
  section_path: z.array(z.string().min(1)).min(1).max(4),
  section_id: z.string().uuid().optional(), // NEW: direct section reference
  description: z.string().max(3000).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  is_available: z.boolean().optional(),
  variant_groups: z.array(variantGroup).max(10).optional(),
  modifier_groups: z.array(modifierGroup).max(10).optional(),
  tags: z.array(tagSchema).max(16).optional(),
  details: z.record(z.any()).optional(),
});

export type ItemClient = z.infer<typeof itemClientSchema>;


