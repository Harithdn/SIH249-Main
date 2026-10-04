// API client — all backend integration goes through this module.
// BASE resolution:
//  - VITE_API_URL (set explicitly, e.g. production builds)
//  - same-origin '' (dev server proxies /api, /health to the backend; preview/ingress does the same)
const BASE = (import.meta as any).env?.VITE_API_URL || '';
export const apiBase = BASE;

function headers(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Role': localStorage.getItem('role') || 'command' };
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(BASE + path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `API ${r.status}`);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('octet') || ct.includes('csv') || ct.includes('text/plain')) return (await r.blob()) as any;
  return r.json();
}
export const get = <T = any>(p: string) => api<T>(p);
export const post = <T = any>(p: string, b: any) => api<T>(p, { method: 'POST', body: JSON.stringify(b) });
