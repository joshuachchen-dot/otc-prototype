import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME } from '@/lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  return res.status(200).json({ ok: true });
}
