import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nav } from '../chain.js';
import { requireApiKey } from '../middleware/auth.js';

export default async function (app: FastifyInstance) {
  app.get('/nav/latest', async (_req, reply) => {
    try {
      const [navBn, asOfBn, storedAtBn] = await nav.read.latestNAV();
      return reply.send({
        nav: navBn.toString(),
        asOf: asOfBn.toString(),
        storedAt: storedAtBn.toString(),
      });
    } catch (err: any) {
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Failed to read NAV' });
    }
  });

  app.post('/nav/post', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({
        nav: z.string().regex(/^\d+$/, 'nav must be a non-negative integer string'),
        asOf: z.number().int().positive(),
      }).parse(req.body);
      const txHash = await nav.write.postNAV([BigInt(body.nav), BigInt(body.asOf)]);
      return reply.send({ tx: txHash });
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Failed to post NAV' });
    }
  });
}
