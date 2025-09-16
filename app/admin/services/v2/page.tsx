'use client';

import { useState } from 'react';
import { serializeHourlyConfig, type UIHourly } from './_serializer';
import { apiFetch } from '@/app/lib/api';

export const dynamic = 'force-dynamic';

export default function ServicesV2Page() {
  const [tenantId, setTenant] = useState('demo-tenant');
  const [name, setName] = useState('Hourly 3h Test');
  const [slug, setSlug] = useState('hourly-3h-test');
  const [hourly, setHourly] = useState<UIHourly>({ tiers: [{ min: 0, max: 60, hours: 3 }], hourlyRateMajor: 1100 });
  const [freqs, setFreqs] = useState([{ key: 'once', label: 'One-time', multiplier: 1 }]);
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [preview, setPreview] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      const config = serializeHourlyConfig(hourly, { frequencies: freqs, vatRatePct: 25 });
      const body = JSON.stringify({ name, slug, model: 'hourly', active: true, config });
      if (!serviceId) {
        const res = await apiFetch('/api/admin/services', { method: 'POST', body, tenantId });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || j?.code || `HTTP_${res.status}`);
        setServiceId(j.id);
      } else {
        const res = await apiFetch(`/api/admin/services/${serviceId}`, { method: 'PUT', body, tenantId });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j?.error || j?.code || `HTTP_${res.status}`);
        }
      }
    } catch (e: any) {
      setErr(e.message || 'SAVE_FAILED');
    } finally {
      setSaving(false);
    }
  }

  async function previewQuote() {
    if (!serviceId) {
      setErr('SAVE_FIRST');
      return;
    }
    setErr(null);
    setLoadingQuote(true);
    try {
      const body = JSON.stringify({
        tenant: { id: tenantId },
        service: { id: serviceId },
        currency: 'SEK',
        rut: true,
        frequency: freqs[0]?.key ?? 'once',
        answers: {},
      });
      const res = await apiFetch('/api/pricing/v2/quote', { method: 'POST', body, tenantId });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || j?.code || `HTTP_${res.status}`);
      setPreview(j);
    } catch (e: any) {
      setErr(e.message || 'QUOTE_FAILED');
    } finally {
      setLoadingQuote(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Services v2 — Hourly</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm" htmlFor="tenantId">
          <div>Tenant ID</div>
          <input id="tenantId" title="Tenant ID" placeholder="demo-tenant" className="w-full rounded-xl border p-2 text-sm" value={tenantId} onChange={(e) => setTenant(e.target.value)} />
        </label>
        <label className="text-sm" htmlFor="serviceName">
          <div>Service name</div>
          <input id="serviceName" title="Service name" placeholder="Hourly 3h Test" className="w-full rounded-xl border p-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm" htmlFor="slug">
          <div>Slug</div>
          <input
            id="slug"
            title="Service slug"
            placeholder="hourly-3h-test"
            className="w-full rounded-xl border p-2 text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          />
        </label>
        <div className="text-sm">
          <div>Frequencies</div>
          <div className="rounded-xl border p-2">
            <div className="flex items-center gap-2">
              <input
                title="Frequency key"
                placeholder="once"
                className="w-36 rounded-xl border p-2"
                value={freqs[0].key}
                onChange={(e) => setFreqs([{ ...freqs[0], key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }])}
              />
              <input
                title="Frequency label"
                placeholder="One-time"
                className="w-48 rounded-xl border p-2"
                value={freqs[0].label}
                onChange={(e) => setFreqs([{ ...freqs[0], label: e.target.value }])}
              />
              <input
                type="number"
                step="0.01"
                title="Frequency multiplier"
                placeholder="1"
                className="w-24 rounded-xl border p-2"
                value={freqs[0].multiplier}
                onChange={(e) => setFreqs([{ ...freqs[0], multiplier: +e.target.value }])}
              />
            </div>
          </div>
        </div>
      </div>

      <HourlyPanel value={hourly} onChange={setHourly} />

      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">
          {saving ? 'Saving…' : serviceId ? 'Update' : 'Save'}
        </button>
        <button
          onClick={previewQuote}
          disabled={!serviceId || loadingQuote}
          className="rounded-xl bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loadingQuote ? 'Quoting…' : 'Preview Quote'}
        </button>
        {serviceId && <span className="text-xs text-neutral-500">id: {serviceId}</span>}
      </div>

      {preview && (
        <div className="rounded-2xl border p-3 text-sm">
          <div className="font-medium mb-2">Quote</div>
          <pre className="text-xs overflow-x-auto">{JSON.stringify(preview, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function HourlyPanel({ value, onChange }: { value: UIHourly; onChange: (v: UIHourly) => void }) {
  const add = () =>
    onChange({
      ...value,
      tiers: [...value.tiers, { min: value.tiers.at(-1)?.max ?? 60, max: (value.tiers.at(-1)?.max ?? 60) + 50, hours: 3 }],
    });
  const patch = (i: number, k: keyof UIHourly['tiers'][number], v: number) => {
    onChange({ ...value, tiers: value.tiers.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)) });
  };
  const del = (i: number) => onChange({ ...value, tiers: value.tiers.filter((_, idx) => idx !== i) });

  return (
    <section className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="font-medium">Hourly pricing</div>
      <p className="text-sm text-neutral-600 mb-2">Add area tiers (m²) and hours per tier, then set one hourly rate.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th>Min m²</th>
              <th>Max m²</th>
              <th>Hours</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {value.tiers.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="py-2 pr-2">
                  <input aria-label="Min area" type="number" className="w-24 rounded-xl border p-2" value={r.min} onChange={(e) => patch(i, 'min', +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input aria-label="Max area" type="number" className="w-24 rounded-xl border p-2" value={r.max} onChange={(e) => patch(i, 'max', +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input aria-label="Hours" type="number" className="w-20 rounded-xl border p-2" value={r.hours} onChange={(e) => patch(i, 'hours', +e.target.value)} />
                </td>
                <td className="py-2">
                  <button type="button" className="rounded-xl border px-3 py-2 hover:bg-neutral-50" onClick={() => del(i)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className="rounded-xl border px-3 py-2 hover:bg-neutral-50" onClick={add}>
          + Add tier
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm">Hourly rate (SEK)</span>
          <input
            type="number"
            title="Hourly rate (SEK)"
            placeholder="1100"
            className="w-28 rounded-xl border p-2"
            value={value.hourlyRateMajor}
            onChange={(e) => onChange({ ...value, hourlyRateMajor: +e.target.value })}
          />
        </div>
      </div>
    </section>
  );
}


