'use client';
import { useEffect, useState } from 'react';
import { useWidget } from './store';
import { ToastHost } from './ui/Toast';
import { MenuView } from './MenuView';

export function WidgetRoot({ restaurantId, sessionId }: { restaurantId: string; sessionId: string }) {
  const setContext = useWidget(s => s.setContext);
  const [menu, setMenu] = useState<{ sections: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setContext(restaurantId, sessionId);
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/menu?restaurantId=${restaurantId}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      setMenu(json);
      setLoading(false);
    })();
  }, [restaurantId, sessionId, setContext]);

  return (
    <>
      <ToastHost />
      {loading ? <div className="p-4 text-center">Loading menu…</div>
        : menu ? <MenuView sections={menu.sections} />
        : <div className="p-4">Menu unavailable.</div>}
    </>
  );
}
