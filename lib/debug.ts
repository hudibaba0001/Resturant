// Debug utilities for browser console
export const debug = {
  // Store reference to last error
  lastError: null as any,
  
  // Debug cart state
  cart: () => {
    if (typeof window !== 'undefined' && (window as any).store) {
      console.table((window as any).store.getState().cart);
    } else {
      console.log('Store not available');
    }
  },
  
  // Debug session
  session: () => {
    if (typeof window !== 'undefined' && (window as any).store) {
      console.log('Session:', (window as any).store.getState().sessionId);
    } else {
      console.log('Store not available');
    }
  },
  
  // Debug API calls
  api: {
    lastRequest: null as any,
    lastResponse: null as any,
    
    log: (url: string, method: string, data?: any) => {
      debug.api.lastRequest = { url, method, data, timestamp: new Date() };
      console.log(`🌐 API ${method} ${url}`, data);
    },
    
    response: (url: string, status: number, data?: any) => {
      debug.api.lastResponse = { url, status, data, timestamp: new Date() };
      if (status >= 400) {
        console.error(`❌ API ${url} returned ${status}`, data);
        debug.lastError = data;
      } else {
        console.log(`✅ API ${url} returned ${status}`, data);
      }
    }
  },
  
  // Debug widget state
  widget: () => {
    if (typeof window !== 'undefined') {
      console.log('Widget Debug Info:');
      console.log('- URL:', window.location.href);
      console.log('- User Agent:', navigator.userAgent);
      console.log('- Last Error:', debug.lastError);
      console.log('- Last API Request:', debug.api.lastRequest);
      console.log('- Last API Response:', debug.api.lastResponse);
    }
  },
  
  // Clear debug info
  clear: () => {
    debug.lastError = null;
    debug.api.lastRequest = null;
    debug.api.lastResponse = null;
    console.clear();
  }
};

// Make debug available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).DEBUG = debug;
}
