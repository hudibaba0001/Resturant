import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

export const log = {
  info: (msg: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${msg}`, data || '');
    
    if (isProduction && data) {
      Sentry.addBreadcrumb({
        category: 'info',
        message: msg,
        data,
        level: 'info',
      });
    }
  },

  error: (msg: string, error: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${msg}`, error);
    
    if (isProduction) {
      Sentry.captureException(error, {
        tags: { context: msg },
        extra: { message: msg }
      });
    }
  },

  warn: (msg: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${msg}`, data || '');
    
    if (isProduction) {
      Sentry.addBreadcrumb({
        category: 'warning',
        message: msg,
        data,
        level: 'warning',
      });
    }
  },

  debug: (msg: string, data?: any) => {
    if (!isProduction) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${msg}`, data || '');
    }
  },

  // API-specific logging
  api: {
    request: (url: string, method: string, data?: any) => {
      log.info(`API ${method} ${url}`, data);
    },
    
    response: (url: string, status: number, data?: any) => {
      if (status >= 400) {
        log.error(`API ${url} returned ${status}`, data);
      } else {
        log.info(`API ${url} returned ${status}`, data);
      }
    },
    
    error: (url: string, error: any) => {
      log.error(`API ${url} failed`, error);
    }
  },

  // Database-specific logging
  db: {
    query: (sql: string, params?: any) => {
      log.debug('DB Query', { sql, params });
    },
    
    error: (sql: string, error: any) => {
      log.error(`DB Query failed: ${sql}`, error);
    }
  }
};
