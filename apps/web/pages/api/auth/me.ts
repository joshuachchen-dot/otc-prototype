import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ user: null });
  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ user: null });
  return res.status(200).json({ user });
}
