import { zServiceConfigV21HourlyOnly, type ServiceConfigV21HourlyOnly } from '@/app/lib/zod/service-config';

export type UIHourlyTier = { min: number; max: number; hours: number };
export type UIHourly = { tiers: UIHourlyTier[]; hourlyRateMajor: number };

const toMinor = (n: number): number => Math.round((n ?? 0) * 100);

export function serializeHourlyConfig(
  hourly: UIHourly,
  opts: { frequencies: { key: string; label: string; multiplier: number }[]; vatRatePct?: number }
): ServiceConfigV21HourlyOnly {
  const sorted = [...hourly.tiers].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sorted.length; i += 1) {
    const r = sorted[i];
    if (!(r.min < r.max)) throw new Error('INVALID_RANGE_MIN_MAX');
    if (r.hours < 0) throw new Error('INVALID_HOURS');
    if (i > 0 && r.min < sorted[i - 1].max) throw new Error('OVERLAPPING_RANGES');
  }

  const out: ServiceConfigV21HourlyOnly = {
    model: 'hourly',
    hourly: {
      areaToHours: sorted.map((r) => ({ min: +r.min, max: +r.max, hours: Math.round(r.hours) })),
      hourlyRate: toMinor(hourly.hourlyRateMajor),
    },
    frequencyOptions: opts.frequencies?.length ? opts.frequencies : [{ key: 'once', label: 'One-time', multiplier: 1 }],
    booleanModifiers: [],
    addOns: [],
    fees: [],
    vatRatePct: opts.vatRatePct ?? 25,
  };

  return zServiceConfigV21HourlyOnly.parse(out);
}


