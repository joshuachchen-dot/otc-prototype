import { SignJWT, jwtVerify } from 'jose';
import type { Role, SessionUser } from './auth-client';

export type { Role, SessionUser } from './auth-client';
export { COOKIE_NAME, ROUTE_ROLES, ROLE_HOME, ROLE_LABEL, ROLE_COLOR } from './auth-client';

export const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

// ── Demo credentials ──────────────────────────────────────────────────────────
const USERS: Array<SessionUser & { password: string }> = [
  { username: 'investor', password: 'investor123', role: 'investor', name: 'Demo Investor' },
  { username: 'manager',  password: 'manager123',  role: 'manager',  name: 'Fund Manager'  },
  { username: 'auditor',  password: 'auditor123',  role: 'auditor',  name: 'Compliance Auditor' },
];

export function checkCredentials(username: string, password: string): SessionUser | null {
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return null;
  return { username: user.username, name: user.name, role: user.role };
}

// ── JWT helpers ───────────────────────────────────────────────────────────────
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'archon-dev-secret-do-not-use-in-production'
);

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role, name: user.name, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      username: payload.username as string,
      name:     payload.name     as string,
      role:     payload.role     as Role,
    };
  } catch {
    return null;
  }
}
