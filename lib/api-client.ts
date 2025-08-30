import { log } from './logger';
import { debug } from './debug';

export async function apiCall(url: string, options?: RequestInit) {
  const method = options?.method || 'GET';
  const body = options?.body;
  
  // Log request
  log.api.request(url, method, body);
  debug.api.log(url, method, body);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }
    
    // Log response
    log.api.response(url, response.status, data);
    debug.api.response(url, response.status, data);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    log.api.error(url, error);
    throw error;
  }
}

// Widget-specific API calls
export const widgetApi = {
  // Get menu
  getMenu: async (restaurantId: string) => {
    return apiCall(`/api/public/menu?restaurantId=${restaurantId}`);
  },
  
  // Create session
  createSession: async (restaurantId: string) => {
    return apiCall('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ restaurantId }),
    });
  },
  
  // Place order
  placeOrder: async (orderData: any) => {
    return apiCall('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },
  
  // Chat
  chat: async (message: string, sessionId: string) => {
    return apiCall('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }
};
