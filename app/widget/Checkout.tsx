'use client';
import { useState } from 'react';
import { useWidget, type CartLine, type Store } from './store';
import { formatMoney } from './utils/money';
import { useToast } from './ui/Toast';

export function CartBar() {
  const cart = useWidget((s: Store) => s.cart);
  const currency = cart[0]?.currency ?? 'SEK';
  const go = useWidget((s: Store) => s.go);

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
  const cart         = useWidget((s: Store) => s.cart);
  const restaurantId = useWidget((s: Store) => s.restaurantId);
  const sessionToken = useWidget((s: Store) => s.sessionToken);
  const clearCart    = useWidget((s: Store) => s.clearCart);
  const go           = useWidget((s: Store) => s.go);

  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const total = cart.reduce((s, l) => s + l.unit_cents * l.qty, 0);
  const currency = cart[0]?.currency ?? 'SEK';

  const place = async () => {
    setSubmitting(true);
    try {
      const { restaurantId, sessionId, sessionToken, cart } = useWidget.getState();

      // ✅ Enforce UUID format for item IDs
      const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (const line of cart) {
        if (!UUID.test(line.itemId)) {
          console.error('Invalid item id in cart:', line.itemId);
          toast('Invalid item in cart');
          throw new Error('INVALID_ITEM_ID');
        }
      }

      const items = cart.map(l => ({
        itemId: l.itemId,
        qty: l.qty,
        notes: l.notes ?? null,
        // include selections only if you added the column in DB
        ...(l.variant || (l.modifiers && l.modifiers.length)
          ? { selections: { variant: l.variant, modifiers: l.modifiers } }
          : {}),
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          sessionId,            // optional
          sessionToken,         // preferred
          type: 'pickup',       // or 'dine_in' (underscore form)
          items,
        }),
      });

      if (!res.ok) {
        let msg = 'ORDER_FAILED';
        try { const j = await res.json(); msg = j.code || msg; } catch {}
        toast(msg);
        throw new Error(`HTTP ${res.status} ${msg}`);
      }

      const json = await res.json();
      toast(`Order placed! Code ${json.order.order_code}`);
      clearCart();
      go('menu');
    } catch (error) {
      console.error('Order error:', error);
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
