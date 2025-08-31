export function safeErr(code = 'INTERNAL_ERROR', status = 500) {
  return { code, status };
}

export function jsonError(code: string, status = 400) {
  return new Response(JSON.stringify({ code }), { 
    status, 
    headers: { 'content-type': 'application/json' } 
  });
}

export function sanitizeError(error: any): string {
  // Log the full error server-side for debugging
  console.error('Internal error:', error);
  
  // Return safe error message to client
  if (error?.code && typeof error.code === 'string') {
    return error.code;
  }
  return 'INTERNAL_ERROR';
}
