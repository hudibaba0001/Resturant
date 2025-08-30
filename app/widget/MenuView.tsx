/* eslint-disable @next/next/no-img-element */
'use client';
import { useWidget } from './store';
import type { MenuItemDTO } from './types/menu';
import { formatMoney } from './utils/money';

export function MenuView({ sections }: { sections: any[] }) {
  return (
    <div className="w-full h-full overflow-y-auto">
      {sections.map((sec: any) => <Section key={sec.id} section={sec} />)}
    </div>
  );
}

function Section({ section }: { section: any }) {
  return (
    <section className="px-3 py-2">
      <h2 className="sticky top-0 z-10 bg-white/80 backdrop-blur px-1 py-2 text-lg font-semibold">{section.name}</h2>
      <div className="grid grid-cols-1 gap-3">
        {section.items?.map((it: MenuItemDTO) => <MenuItemCard key={it.id} item={it} />)}
      </div>
      {section.children?.map((child: any) => <Section key={child.id} section={child} />)}
    </section>
  );
}

export function MenuItemCard({
  item, variant = 'full', onAddToCart,
}: { item: MenuItemDTO; variant?: 'full' | 'chat'; onAddToCart?: () => void }) {
  const openItem = useWidget((s) => s.openItem);
  return (
    <button className="flex w-full rounded-2xl shadow-sm overflow-hidden bg-white text-left active:opacity-90"
      onClick={() => openItem(item)}>
      {item.thumb && (
        <div className="relative w-24 h-24 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.thumb} alt={item.name} className="object-cover w-full h-full" loading="lazy" />
        </div>
      )}
      <div className="p-3 flex-1">
        <div className="text-base font-medium">{item.name}</div>
        {item.desc && <div className="text-sm text-gray-600 line-clamp-2">{item.desc}</div>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold">{formatMoney(item.price_cents, item.currency)}</span>
          <span className="text-xs">{item.dietary?.join(' • ')}</span>
          {variant === 'chat' && (
            <button className="ml-2 rounded-xl px-2 py-1 border" onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}>
              + Add
            </button>
          )}
        </div>
      </div>
    </button>
  );
}
