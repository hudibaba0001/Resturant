'use client';
import { useMemo, useState } from 'react';
import { useWidget } from './store';
import { formatMoney } from './utils/money';

export function ItemDetailModal() {
  const { selectedItem: item, addToCart, closeModal } = useWidget((s) => ({
    selectedItem: s.selectedItem, addToCart: s.addToCart, closeModal: s.closeModal
  }));
  const [variant, setVariant] = useState<{ groupId: string; optionId: string; name: string; plus_cents: number }>();
  const [mods, setMods] = useState<Array<{ optionId: string; name: string; plus_cents: number }>>([]);
  
  const total = useMemo(() => {
    if (!item) return 0;
    const v = variant?.plus_cents ?? 0;
    const m = mods.reduce((s, x) => s + (x.plus_cents || 0), 0);
    return item.price_cents + v + m;
  }, [item, item?.price_cents, variant, mods]);

  if (!item) return null;

  const vg = item.variantGroups?.[0];
  const valid = !vg?.required || !!variant;

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {item.thumb && <img src={item.thumb} alt={item.name} className="w-full h-56 object-cover" />}
      <div className="p-4">
        <h3 className="text-xl font-semibold">{item.name}</h3>
        {item.desc && <p className="text-gray-600 mt-1">{item.desc}</p>}

        {vg && (
          <div className="mt-4">
            <div className="font-medium">{vg.name}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {vg.options.map(opt => (
                <label key={opt.id} className={`border rounded-xl p-2 ${variant?.optionId === opt.id ? 'border-black' : ''}`}>
                  <input type="radio" name={`vg-${vg.id}`} className="hidden"
                    onChange={() => setVariant({ groupId: vg.id, optionId: opt.id, name: opt.name, plus_cents: opt.plus_cents })}/>
                  <div className="flex items-center justify-between">
                    <span>{opt.name}</span>
                    <span className="text-sm">{opt.plus_cents ? `+ ${formatMoney(opt.plus_cents, item.currency)}` : 'Included'}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {item.modifierGroups?.map(g => (
          <div key={g.id} className="mt-4">
            <div className="font-medium">{g.name} <span className="text-xs text-gray-500">(choose {g.min}–{g.max})</span></div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {g.options.filter(o => o.is_available).map(o => {
                const selected = mods.some(m => m.optionId === o.id);
                const selectedCount = mods.filter(m =>
                  item.modifierGroups?.some(gg => gg.id === g.id && gg.options.some(oo => oo.id === m.optionId))
                ).length;
                const canSelect = selected || selectedCount < g.max;
                return (
                  <button type="button" key={o.id}
                    className={`border rounded-xl p-2 text-left ${selected ? 'border-black' : ''}`}
                    onClick={() => {
                      if (selected) setMods(m => m.filter(x => x.optionId !== o.id));
                      else if (canSelect) setMods(m => [...m, { optionId: o.id, name: o.name, plus_cents: o.plus_cents }]);
                    }}>
                    <div className="flex items-center justify-between">
                      <span>{o.name}</span>
                      <span className="text-sm">{o.plus_cents ? `+ ${formatMoney(o.plus_cents, item.currency)}` : 'Free'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="h-16" />
      </div>

      <div className="fixed bottom-0 inset-x-0 p-3 bg-white border-t">
        <div className="flex gap-2">
          <button className="flex-1 rounded-xl border" onClick={closeModal}>Cancel</button>
          <button className="flex-1 rounded-xl bg-black text-white disabled:opacity-40" disabled={!valid}
            onClick={() => {
              useWidget.getState().addToCart({
                itemId: item.id, name: item.name, qty: 1, unit_cents: total, currency: item.currency,
                variant, modifiers: mods,
              });
              useWidget.getState().closeModal();
            }}>
            Add to cart • {formatMoney(total, item.currency)}
          </button>
        </div>
      </div>
    </div>
  );
}
