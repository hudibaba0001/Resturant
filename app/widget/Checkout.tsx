'use client';
import { useState } from 'react';
import { useWidget, type CartLine } from './store';
import { formatMoney } from './utils/money';
import { useToast } from './ui/Toast';

export function CartBar() {
  const cart = useWidget(s => s.cart);
  const currency = cart[0]?.currency ?? 'SEK';
  const go = useWidget(s => s.go);

  const total = cart.reduce((s, l) => s + l.unit_cents * l.qty, 0);
  if (!cart.length) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 p-3 bg-white border-t">
      <div className="flex justify-between items-center">
        <div>{cart.length} item(s) • {formatMoney(total, currency)}</div>
        <button className="rounded-xl bg-black text-white px-4 py-2" onClick={() => go('checkout')}>
          Checkout
        </button>
      </div>
    </div>
  );
}

export function CheckoutScreen() {
  const cart         = useWidget(s => s.cart);
  const restaurantId = useWidget(s => s.restaurantId);
  const sessionToken = useWidget(s => s.sessionToken);
  const clearCart    = useWidget(s => s.clearCart);
  const go           = useWidget(s => s.go);

  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const total = cart.reduce((s, l) => s + l.unit_cents * l.qty, 0);
  const currency = cart[0]?.currency ?? 'SEK';

  const place = async () => {
    setSubmitting(true);
    try {
      const items = cart.map((l: CartLine) => ({
        itemId: l.itemId,
        qty: l.qty,
        notes: l.notes ?? null,
        variant: l.variant ? { groupId: l.variant.groupId, optionId: l.variant.optionId } : undefined,
        modifiers: l.modifiers?.map((m) => m.optionId) ?? [],
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, sessionToken, type: 'pickup', items }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        toast(json.code ? `Order failed: ${json.code}` : `Order failed (${res.status})`);
        return;
      }

      toast(`Order placed! Code ${json.order.order_code}`);
      clearCart();
      go('menu');
    } catch {
      toast('Order failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white p-4">
      <h3 className="text-xl font-semibold mb-2">Checkout</h3>

      <div className="space-y-2">
        {cart.map((l: CartLine) => (
          <div key={l.tempId} className="flex justify-between">
            <div>{l.name} × {l.qty}</div>
            <div>{formatMoney(l.unit_cents * l.qty, l.currency)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between font-medium">
        <span>Total</span><span>{formatMoney(total, currency)}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="flex-1 rounded-xl border" onClick={() => useWidget.getState().go('cart')}>Back</button>
        <button className="flex-1 rounded-xl bg-black text-white disabled:opacity-40" disabled={submitting} onClick={place}>
          {submitting ? 'Placing…' : 'Place order'}
        </button>
      </div>
    </div>
  );
}
