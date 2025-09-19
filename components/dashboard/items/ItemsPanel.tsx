"use client";
import React from "react";
import { API } from "@/lib/api/paths";

type Item = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  price: number;
  currency: string;
  image_url: string | null;
  is_available: boolean;
  restaurant_id: string;
  category: string; // menu slug
  section_path: string[];
};

type Props = {
  restaurantId: string; // UUID
  menu: string;         // menu slug, e.g. "main"
  section: string;      // selected section name, e.g. "Drinks"
};

export default function ItemsPanel({ restaurantId, menu, section }: Props) {
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [priceKr, setPriceKr] = React.useState(""); // "49" or "49.00" → cents
  const [currency, setCurrency] = React.useState("SEK");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const base = API.items;

  const fetchItems = React.useCallback(async (signal?: AbortSignal | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${base}?restaurantId=${encodeURIComponent(restaurantId)}&menu=${encodeURIComponent(menu)}&section=${encodeURIComponent(section)}&limit=50`;
      const init: RequestInit & { signal?: AbortSignal | null } = { method: "GET", cache: "no-store" };
      if (signal) init.signal = signal;
      const res = await fetch(url, init as RequestInit);
      const body = await res.json();
      if (!res.ok || body?.ok === false) throw new Error(body?.message || "Failed to load items");
      setItems((body?.data ?? body) as Item[]);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e.message || "Failed to load items");
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [base, restaurantId, menu, section]);

  React.useEffect(() => {
    const ctrl = new AbortController();
    fetchItems(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchItems]);

  // Refresh when someone elsewhere creates/updates items
  React.useEffect(() => {
    function onExternalRefresh() { fetchItems(); }
    window.addEventListener('items:refresh', onExternalRefresh);
    return () => window.removeEventListener('items:refresh', onExternalRefresh);
  }, [fetchItems]);

  function toCents(input: string) {
    const s = input.trim().replace(",", ".");
    if (s === "") return null;
    if (/^\d+$/.test(s)) return parseInt(s, 10); // already cents
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const cents = toCents(priceKr);
    if (cents == null || cents < 0) {
      setSubmitting(false);
      setError("Enter a valid price");
      return;
    }

    const payload = {
      restaurantId,
      menu,
      name: name.trim(),
      price_cents: cents,
      currency: (currency || "SEK").toUpperCase(),
      section_path: [section],
      description: description.trim() || undefined,
    };

    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        const issues = body?.issues as Array<{ path: (string|number)[]; message: string }> | undefined;
        if (issues?.length) throw new Error(issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
        throw new Error(body?.message || "Failed to create item");
      }
      const created = (body?.data ?? body) as Item;
      setItems(prev => [created, ...(prev ?? [])]); // optimistic refresh
      setName(""); setPriceKr(""); setDescription("");
    } catch (e: any) {
      setError(e.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* List */}
      <div className="rounded-2xl border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-medium">Items in {section}</h3>
          <button
            onClick={() => fetchItems()}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!items && <div className="text-sm text-gray-500">Loading…</div>}
        {items && items.length === 0 && <div className="text-sm text-gray-500">No items yet.</div>}
        {items && items.length > 0 && (
          <ul className="divide-y">
            {items.map(it => (
              <li key={it.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-gray-500">{it.section_path?.join(" / ") || "—"}</div>
                </div>
                <div className="text-sm tabular-nums">
                  {(it.price_cents / 100).toFixed(2)} {it.currency}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add form */}
      <form onSubmit={onSubmit} className="rounded-2xl border p-4 space-y-3">
        <h4 className="text-base font-medium">Add item to {section}</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">Name</span>
            <input value={name} onChange={e=>setName(e.target.value)} required
              className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Latte" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Price</span>
            <input value={priceKr} onChange={e=>setPriceKr(e.target.value)} required inputMode="decimal"
              className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="49" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Currency</span>
            <input value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="SEK" />
          </label>
          <label className="block md:col-span-1 md:col-start-1 md:row-start-2 md:col-end-5">
            <span className="text-sm text-gray-600">Description <span className="text-gray-400">(optional)</span></span>
            <input value={description} onChange={e=>setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Double-shot espresso with milk" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting}
            className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50">
            {submitting ? "Adding…" : "Add item"}
          </button>
          <div className="text-xs text-gray-500">Restaurant: {restaurantId} · Menu: {menu} · Section: {section}</div>
        </div>
      </form>
    </div>
  );
}


