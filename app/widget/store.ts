'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MenuItemDTO } from './types/menu';

export type CartLine = {
  tempId: string;
  itemId: string;
  name: string;
  qty: number;
  unit_cents: number;
  currency: string;
  variant?: { groupId: string; optionId: string; name: string; plus_cents: number };
  modifiers?: Array<{ optionId: string; name: string; plus_cents: number }>;
  notes?: string | null;
};

type UIState = 'menu' | 'item' | 'cart' | 'checkout' | null;

type Store = {
  restaurantId: string;
  sessionId: string;
  sessionToken: string;
  cart: CartLine[];
  ui: UIState;
  selectedItem: MenuItemDTO | null;
  setContext: (restaurantId: string, sessionId: string, sessionToken: string) => void;
  bootstrapSession: (restaurantId: string) => Promise<boolean>;
  openItem: (item: MenuItemDTO) => void;
  closeModal: () => void;
  addToCart: (line: Omit<CartLine, 'tempId'>) => void;
  updateCartLine: (tempId: string, patch: Partial<CartLine>) => void;
  removeCartLine: (tempId: string) => void;
  clearCart: () => void;
  go: (ui: UIState) => void;
};

export const useWidget = create<Store>()(
  persist(
    (set, get) => ({
      restaurantId: '',
      sessionId: '',
      sessionToken: '',
      cart: [],
      ui: 'menu',
      selectedItem: null,
      setContext: (restaurantId, sessionId, sessionToken) => set({ restaurantId, sessionId, sessionToken }),
      bootstrapSession: async (restaurantId) => {
        try {
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId, locale: navigator.language })
          });
          const json = await res.json();
          if (!res.ok) {
            console.error('Session bootstrap failed:', json);
            return false;
          }
          set({ 
            restaurantId, 
            sessionId: json.sessionId, 
            sessionToken: json.sessionToken 
          });
          return true;
        } catch (error) {
          console.error('Session bootstrap error:', error);
          return false;
        }
      },
      openItem: (item) => set({ selectedItem: item, ui: 'item' }),
      closeModal: () => set({ selectedItem: null, ui: 'menu' }),
      addToCart: (line) =>
        set((s) => {
          if (s.cart.length && s.cart[0].currency !== line.currency) return s; // prevent mixed currency
          return { cart: [...s.cart, { ...line, tempId: crypto.randomUUID() }], ui: 'menu' };
        }),
      updateCartLine: (tempId, patch) =>
        set((s) => ({ cart: s.cart.map(l => l.tempId === tempId ? { ...l, ...patch } : l) })),
      removeCartLine: (tempId) =>
        set((s) => ({ cart: s.cart.filter(l => l.tempId !== tempId) })),
      clearCart: () => set({ cart: [] }),
      go: (ui) => set({ ui }),
    }),
    {
      name: 'stjarna-cart',
      partialize: (s) => ({ cart: s.cart, sessionId: s.sessionId, sessionToken: s.sessionToken }),
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : undefined as any)),
    }
  )
);
