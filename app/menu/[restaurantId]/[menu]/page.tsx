// app/menu/[restaurantId]/[menu]/page.tsx
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { restaurantId: string; menu: string };

type Item = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  is_available: boolean;
  category: string;
  section_path: string[];
  tags?: string[] | null;
};

async function fetchPublicMenu(restaurantId: string, menu: string) {
  // Try absolute first (helps some hosting setups), then fallback to relative path
  const absBase = process.env.NEXT_PUBLIC_BASE_URL || '';
  const absUrl = absBase ? `${absBase}/api/public/menu?restaurantId=${restaurantId}&menu=${menu}` : '';
  if (absUrl) {
    try {
      const r = await fetch(absUrl, { cache: 'no-store' });
      if (r.ok) return (await r.json()) as { ok: boolean; data: Item[] };
    } catch {}
  }
  const res = await fetch(`/api/public/menu?restaurantId=${restaurantId}&menu=${menu}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Public API failed: ${res.status}`);
  return (await res.json()) as { ok: boolean; data: Item[] };
}

function groupBySection(items: Item[]): Record<string, Item[]> {
  const groups: Record<string, Item[]> = {};
  for (const it of items) {
    const key = (it.section_path && it.section_path[0]) || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  }
  return groups;
}

function formatPrice(cents: number, currency: string) {
  const amount = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { restaurantId, menu } = params;
  return {
    title: `Menu — ${menu}`,
    description: `Public menu for ${restaurantId} / ${menu}`,
  };
}

export default async function Page({ params }: { params: Params }) {
  const { restaurantId, menu } = params;
  const { ok, data } = await fetchPublicMenu(restaurantId, menu);
  const items = ok ? data.filter((d) => d.is_available) : [];
  const groups = groupBySection(items);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Menu: {menu}</h1>

      {items.length === 0 ? (
        <p className="opacity-70">No items yet.</p>
      ) : (
        Object.entries(groups).map(([section, list]) => (
          <section key={section} className="mb-8">
            <h2 className="text-xl font-medium mb-3">{section}</h2>
            <ul className="space-y-2">
              {list.map((it) => (
                <li key={it.id} className="flex items-start justify-between border rounded-lg p-3">
                  <div className="pr-4">
                    <div className="font-medium">{it.name}</div>
                    {it.description && <div className="text-sm opacity-70">{it.description}</div>}
                    {it.tags?.length ? (
                      <div className="mt-1 text-xs opacity-70">{it.tags.join(" • ")}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0">{formatPrice(it.price_cents, it.currency)}</div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}


