import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAddress } from 'viem';
import { db } from '../db/client.js';
import { requireApiKey } from '../middleware/auth.js';

export default async function (app: FastifyInstance) {
  app.post('/kyc/mark-eligible', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({
        address: z.string().refine(isAddress, 'Invalid Ethereum address'),
        vcHash: z.string().optional(),
      }).parse(req.body);

      if (!db) return reply.code(503).send({ error: 'Database not configured (DATABASE_URL missing)' });

      await db.query(
        'insert into investors(address, eligible, vc_hash) values($1, true, $2) on conflict (address) do update set eligible=true, vc_hash=excluded.vc_hash',
        [body.address.toLowerCase(), body.vcHash ?? null],
      );
      return { ok: true };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.message ?? 'KYC update failed' });
    }
  });

  app.get('/kyc/:address', async (req, reply) => {
    try {
      const { address } = req.params as { address: string };
      if (!isAddress(address)) return reply.code(400).send({ error: 'Invalid Ethereum address' });
      if (!db) return reply.code(503).send({ error: 'Database not configured (DATABASE_URL missing)' });

      const { rows } = await db.query(
        'select eligible, vc_hash from investors where address=$1',
        [address.toLowerCase()],
      );
      return rows[0] ?? { eligible: false };
    } catch (err: any) {
      reply.code(500).send({ error: err.message ?? 'KYC lookup failed' });
    }
  });
}
