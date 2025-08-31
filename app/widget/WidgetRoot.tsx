'use client';
import { useEffect, useState } from 'react';
import { useWidget, type Store } from './store';
import { ToastHost } from './ui/Toast';
import { MenuView } from './MenuView';
import { ChatWidget } from './ChatWidget';

async function mintRealSession(restaurantId: string) {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ restaurantId, locale: navigator.language }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`SESSION_BOOTSTRAP_FAILED ${j.code || ''}`);
  return j as { sessionId: string; sessionToken: string };
}

export function WidgetRoot({ restaurantId, sessionId }: { restaurantId: string; sessionId?: string }) {
  const setContext = useWidget((s: Store) => s.setContext);
  const bootstrapSession = useWidget((s: Store) => s.bootstrapSession);
  const sessionToken = useWidget((s: Store) => s.sessionToken);
  const [menu, setMenu] = useState<{ sections: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initWidget = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // ✅ Always ensure we have a real session token (not legacy widget-* tokens)
        const currentToken = useWidget.getState().sessionToken;
        if (!currentToken || currentToken.startsWith('widget-')) {
          try {
            const s = await mintRealSession(restaurantId);
            setContext(restaurantId, s.sessionId, s.sessionToken);
          } catch (e) {
            console.error('Session bootstrap failed:', e);
            setError('Failed to get valid session');
            setLoading(false);
            return;
          }
        }

        // If sessionId is provided, use it directly
        if (sessionId) {
          setContext(restaurantId, sessionId, sessionToken || '');
        }

        // Load menu from the new public endpoint
        const res = await fetch(`/api/public/menu?restaurantId=${restaurantId}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        setMenu(json);
      } catch (err) {
        setError('Failed to load menu');
        console.error('Widget initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initWidget();
  }, [restaurantId, sessionId, setContext, bootstrapSession, sessionToken]);

  return (
    <div className="widget-root">
      <ToastHost />
      {loading ? (
        <div className="p-4 text-center">Loading menu…</div>
      ) : error ? (
        <div className="p-4 text-center text-red-600">{error}</div>
      ) : menu ? (
        <MenuView sections={menu.sections} />
      ) : (
        <div className="p-4">Menu unavailable.</div>
      )}
      
      {/* Chat Widget - Feature Flagged */}
      {process.env.NEXT_PUBLIC_WIDGET_CHAT_ENABLED === 'true' && (
        <ChatWidget />
      )}
    </div>
  );
}
