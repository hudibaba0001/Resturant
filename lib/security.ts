// Security configuration and validation functions

export const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 100,
    WINDOW_MS: 60000,
    BURST_LIMIT: 10,
  },
  
  // Input validation
  VALIDATION: {
    MAX_STRING_LENGTH: 1000,
    MAX_UUID_LENGTH: 36,
    MIN_TOKEN_LENGTH: 50,
    MAX_TOKEN_LENGTH: 5000,
    MAX_COOKIE_LENGTH: 10000,
  },
  
  // CORS
  CORS: {
    ALLOWED_ORIGINS: process.env.NODE_ENV === 'production' 
      ? ['https://resturant-git-feat-data-spine-lovedeep-singhs-projects-96b003a8.vercel.app']
      : ['http://localhost:3000'],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Request-ID'],
    MAX_AGE: 86400,
  },
  
  // Headers
  HEADERS: {
    SECURITY: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
    CORS: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  },
} as const;

// Input sanitization
export function sanitizeString(input: string | null | undefined, maxLength = SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH): string | null {
  if (!input || typeof input !== 'string') return null;
  
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) return trimmed.substring(0, maxLength);
  
  // Remove potentially dangerous characters
  return trimmed
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

// UUID validation
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Token validation
export function isValidToken(token: string): boolean {
  return Boolean(token && 
         typeof token === 'string' &&
         token.startsWith('eyJ') &&
         token.length >= SECURITY_CONFIG.VALIDATION.MIN_TOKEN_LENGTH &&
         token.length <= SECURITY_CONFIG.VALIDATION.MAX_TOKEN_LENGTH);
}

// Rate limiting helper
export class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);
    
    if (!record || now > record.resetTime) {
      this.requests.set(identifier, { 
        count: 1, 
        resetTime: now + SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS 
      });
      return true;
    }
    
    if (record.count >= SECURITY_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  getRemaining(identifier: string): number {
    const record = this.requests.get(identifier);
    if (!record) return SECURITY_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE;
    
    const now = Date.now();
    if (now > record.resetTime) return SECURITY_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE;
    
    return Math.max(0, SECURITY_CONFIG.RATE_LIMIT.REQUESTS_PER_MINUTE - record.count);
  }
  
  getResetTime(identifier: string): number {
    const record = this.requests.get(identifier);
    return record?.resetTime || 0;
  }
}

// Security logging
export function logSecurityEvent(event: string, details: Record<string, any>): void {
  console.warn('🔒 SECURITY EVENT:', {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// Environment validation
export function validateEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate Supabase URL format
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    if (!url.hostname.includes('supabase.co')) {
      throw new Error('Invalid Supabase URL format');
    }
  } catch {
    throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format');
  }
  
  // Validate anon key format
  if (!isValidToken(process.env.SUPABASE_ANON_KEY!)) {
    throw new Error('Invalid SUPABASE_ANON_KEY format');
  }
}
