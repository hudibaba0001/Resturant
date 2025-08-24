export async function sha256Base64(input: string) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const uint8Array = new Uint8Array(buf);
  const b64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
  return b64;
}
export function canonicalize(obj: unknown) {
  return JSON.stringify(obj, Object.keys(obj as any).sort());
}
