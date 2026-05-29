const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const API = (path: string) => `${BASE}${path}`;

// PHASE 1 ONLY: NEXT_PUBLIC_ vars are compiled into the browser bundle and
// visible in DevTools. Replace with a server-side API proxy + JWT in Phase 2.
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = process.env.NEXT_PUBLIC_API_KEY;
  return fetch(API(path), {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(key ? { 'x-api-key': key } : {}) },
  });
}
