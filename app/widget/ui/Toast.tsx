'use client';
import { create } from 'zustand';
import { useEffect } from 'react';

type Toast = { id: string; text: string };
type TStore = { toasts: Toast[]; push: (text: string) => void; remove: (id: string) => void };

const useToastStore = create<TStore>((set) => ({
  toasts: [],
  push: (text) => set((s) => ({ toasts: [...s.toasts, { id: crypto.randomUUID(), text }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export function useToast() { return useToastStore((s) => s.push); }

export function ToastHost() {
  const { toasts, remove } = useToastStore();
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => remove(t.id), 3200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, remove]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className="px-4 py-2 rounded-2xl bg-black text-white shadow">{t.text}</div>
      ))}
    </div>
  );
}
