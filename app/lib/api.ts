export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE ?? '';
}

export async function apiFetch(
  path: string,
  init: (RequestInit & { tenantId: string })
): Promise<Response> {
  const base = apiBase();
  const headers = new Headers(init.headers || {});
  headers.set('x-tenant-id', init.tenantId);
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json');
  return fetch(`${base}${path}`, { ...init, headers, cache: 'no-store' });
}


