const BASE         = process.env.NEXT_PUBLIC_API_URL         ?? 'http://localhost:3001';
const SANDBOX_BASE = process.env.NEXT_PUBLIC_SANDBOX_API_URL ?? BASE;

export const API        = (path: string) => `${BASE}${path}`;
export const sandboxAPI = (path: string) => `${SANDBOX_BASE}${path}`;

function makeAuthFetch(base: string, keyEnvVar: string) {
  return (path: string, init?: RequestInit): Promise<Response> => {
    // PHASE 1 ONLY: NEXT_PUBLIC_ vars are compiled into the browser bundle and
    // visible in DevTools. Replace with a server-side API proxy + JWT in Phase 2.
    const key = process.env[keyEnvVar];
    return fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(key ? { 'x-api-key': key } : {}),
      },
    });
  };
}

export const apiFetch     = makeAuthFetch(BASE,         'NEXT_PUBLIC_API_KEY');
export const sandboxFetch = makeAuthFetch(SANDBOX_BASE, 'NEXT_PUBLIC_SANDBOX_API_KEY');
