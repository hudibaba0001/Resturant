// Standard API response helpers (non-breaking).
// Keeps clients consistent: { code } on error, { ok, data } on success.
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { code: string };

export function ok<T>(data: T, init?: ResponseInit) {
  return new Response(JSON.stringify({ ok: true, data } as ApiOk<T>), {
    status: 200,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
}

export function err(code: string, status = 400, extra?: Record<string, unknown>) {
  const body = extra ? ({ code, ...extra } as ApiErr & Record<string, unknown>) : ({ code } as ApiErr);
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Narrow, typed JSON body reader with safety.
export async function readJson<T>(req: Request): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}
