import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAddress } from 'viem';
import { sanctionsCheck, sanctionsBlock } from '../db/sanctions.js';
import { requireApiKey } from '../middleware/auth.js';

export default async function (app: FastifyInstance) {
  // ── POST /sanctions/block ─────────────────────────────────────────────────
  app.post('/sanctions/block', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({
        address: z.string().refine(isAddress, 'Invalid Ethereum address'),
        reason:  z.string().min(1),
      }).parse(req.body);

      await sanctionsBlock(body.address, body.reason);
      return { ok: true };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.message ?? 'Sanctions update failed' });
    }
  });

  // ── GET /sanctions/check/:address ─────────────────────────────────────────
  app.get('/sanctions/check/:address', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const { address } = req.params as { address: string };
      if (!isAddress(address)) return reply.code(400).send({ error: 'Invalid Ethereum address' });
      await sanctionsCheck(address);
      return { address, blocked: false };
    } catch (err: any) {
      if (err.name === 'SanctionsHit') return reply.code(200).send({ address: (req.params as any).address, blocked: true, reason: err.message });
      reply.code(500).send({ error: err.message ?? 'Sanctions check failed' });
    }
  });
}
