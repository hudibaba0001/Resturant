export interface ChatEvent {
  restaurantId: string;
  sessionToken: string;
  retrievalIds: string[];
  token_in: number;
  token_out: number;
  model: string;
  latency_ms: number;
  validator_pass: boolean;
  source: 'llm' | 'rules';
  message?: string;
  error?: string;
}

export function logChatEvent(event: ChatEvent) {
  try {
    const logEntry = {
      type: 'chat_event',
      timestamp: new Date().toISOString(),
      ...event
    };
    
    console.log(JSON.stringify(logEntry));
  } catch (error) {
    // Silently fail - don't break chat for telemetry
    console.error('Failed to log chat event:', error);
  }
}

export function logError(context: string, error: any, metadata?: Record<string, any>) {
  try {
    const logEntry = {
      type: 'error',
      timestamp: new Date().toISOString(),
      context,
      error: error?.message || String(error),
      stack: error?.stack,
      ...metadata
    };
    
    console.error(JSON.stringify(logEntry));
  } catch (logError) {
    // Silently fail
    console.error('Failed to log error:', logError);
  }
}
