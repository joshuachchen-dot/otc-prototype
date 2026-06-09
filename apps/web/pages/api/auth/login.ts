import type { NextApiRequest, NextApiResponse } from 'next';
import { checkCredentials, signToken, COOKIE_NAME, COOKIE_MAX_AGE, ROLE_HOME } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body ?? {};
  const user = checkCredentials(String(username ?? ''), String(password ?? ''));

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = await signToken(user);

  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`,
  ]);

  return res.status(200).json({ role: user.role, name: user.name, redirect: ROLE_HOME[user.role] });
}
