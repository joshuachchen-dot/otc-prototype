import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';
import { signToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth';
import type { Role } from '@/lib/auth-client';

// Called by NextAuth as the OAuth callbackUrl after a successful social sign-in.
// Reads the NextAuth session, writes an archon_session cookie in the same format
// as the credential login path, then redirects to the intended destination.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.redirect('/login?error=OAuthCallback');
  }

  const role  = ((session.user as any).role ?? 'investor') as Role;
  const name  = session.user.name ?? 'Investor';
  const email = session.user.email ?? '';

  const token = await signToken({ role, name, username: email });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`,
  ]);

  const next = req.query.next;
  const dest = typeof next === 'string' && next.startsWith('/') ? next : '/investor';
  res.redirect(302, dest);
}
