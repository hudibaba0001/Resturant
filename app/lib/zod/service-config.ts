import { z } from 'zod';

export const zAreaToHours = z.object({
  min: z.number(),
  max: z.number(),
  hours: z.number().int().min(0),
});

export const zHourlyModel = z.object({
  areaToHours: z.array(zAreaToHours).min(1),
  hourlyRate: z.number().int().min(0),
});

export type HourlyModel = z.infer<typeof zHourlyModel>;

export const zServiceConfigV21HourlyOnly = z.object({
  model: z.literal('hourly'),
  hourly: zHourlyModel,
  frequencyOptions: z.array(z.object({
    key: z.string().regex(/^[a-z0-9_]+$/),
    label: z.string().min(1),
    multiplier: z.number().min(0).max(2),
  })).min(1),
  booleanModifiers: z.array(z.object({
    key: z.string().regex(/^[a-z0-9_]+$/),
    label: z.string(),
    mode: z.enum(['percent', 'fixed']),
    value: z.number().min(0),
    rutEligible: z.boolean().default(false),
  })).default([]),
  addOns: z.array(z.object({
    key: z.string().regex(/^[a-z0-9_]+$/),
    label: z.string(),
    price_minor: z.number().int().min(0),
    rutEligible: z.boolean().default(true),
  })).default([]),
  fees: z.array(z.object({
    key: z.string().regex(/^[a-z0-9_]+$/),
    label: z.string(),
    amount_minor: z.number().int().min(0),
    rutEligible: z.boolean().default(false),
  })).default([]),
  vatRatePct: z.number().int().min(0).max(100).default(25),
});

export type ServiceConfigV21HourlyOnly = z.infer<typeof zServiceConfigV21HourlyOnly>;


