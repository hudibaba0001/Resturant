// Minimal Plausible wrapper for order status tracking
// Plausible script must be loaded on the page

export function trackOrderStatusChange(from: string, to: string, ok: boolean, code?: string) {
  try {
    // @ts-ignore - Plausible is loaded globally
    window.plausible?.('Order Status Change', { 
      props: { 
        from, 
        to, 
        ok: ok ? 'success' : 'error',
        code: code || 'unknown',
        timestamp: new Date().toISOString()
      } 
    });
  } catch (error) {
    // Silently fail if Plausible is not available
    console.debug('Plausible tracking failed:', error);
  }
}

export function trackOrderConflict(orderId: string, fromStatus: string, attemptedStatus: string) {
  try {
    // @ts-ignore - Plausible is loaded globally
    window.plausible?.('Order Status Conflict', { 
      props: { 
        from: fromStatus,
        attempted: attemptedStatus,
        timestamp: new Date().toISOString()
      } 
    });
  } catch (error) {
    console.debug('Plausible tracking failed:', error);
  }
}

export function trackOrderError(errorCode: string, endpoint: string) {
  try {
    // @ts-ignore - Plausible is loaded globally
    window.plausible?.('Order API Error', { 
      props: { 
        code: errorCode,
        endpoint,
        timestamp: new Date().toISOString()
      } 
    });
  } catch (error) {
    console.debug('Plausible tracking failed:', error);
  }
}
