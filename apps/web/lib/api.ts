const BASE         = process.env.NEXT_PUBLIC_API_URL         ?? 'http://localhost:3001';
const SANDBOX_BASE = process.env.NEXT_PUBLIC_SANDBOX_API_URL ?? BASE;

export const API        = (path: string) => `${BASE}${path}`;
export const sandboxAPI = (path: string) => `${SANDBOX_BASE}${path}`;

// PHASE 1 ONLY: NEXT_PUBLIC_ vars are compiled into the browser bundle and
// visible in DevTools. Replace with a server-side API proxy + JWT in Phase 2.
// NOTE: Next.js only inlines NEXT_PUBLIC_ vars when referenced as static string
// literals — dynamic bracket access (process.env[varName]) bypasses injection.
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = process.env.NEXT_PUBLIC_API_KEY;
  return fetch(API(path), {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(key ? { 'x-api-key': key } : {}) },
  });
}

export function sandboxFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = process.env.NEXT_PUBLIC_SANDBOX_API_KEY ?? process.env.NEXT_PUBLIC_API_KEY;
  return fetch(sandboxAPI(path), {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(key ? { 'x-api-key': key } : {}) },
  });
}
