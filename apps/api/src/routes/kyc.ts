import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAddress } from 'viem';
import { kycMark, kycGet } from '../db/kyc.js';
import { requireApiKey } from '../middleware/auth.js';

export default async function (app: FastifyInstance) {
  app.post('/kyc/mark-eligible', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({
        address: z.string().refine(isAddress, 'Invalid Ethereum address'),
        vcHash:  z.string().optional(),
      }).parse(req.body);

      await kycMark(body.address, body.vcHash);
      return { ok: true };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.message ?? 'KYC update failed' });
    }
  });

  app.get('/kyc/:address', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const { address } = req.params as { address: string };
      if (!isAddress(address)) return reply.code(400).send({ error: 'Invalid Ethereum address' });
      const record = await kycGet(address);
      return record ?? { eligible: false, vc_hash: null };
    } catch (err: any) {
      reply.code(500).send({ error: err.message ?? 'KYC lookup failed' });
    }
  });
}
