import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAddress } from 'viem';
import { token } from '../chain.js';
import { requireApiKey } from '../middleware/auth.js';

const addressSchema = z.string().refine(isAddress, 'Invalid Ethereum address');
const amountSchema = z.string().regex(/^\d+$/, 'amount must be a non-negative integer string');

export default async function (app: FastifyInstance) {
  app.post('/token/subscribe', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({ to: addressSchema, amount: amountSchema }).parse(req.body);
      const tx = await token.write.mint([body.to as `0x${string}`, BigInt(body.amount)]);
      return { tx };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Subscription failed' });
    }
  });

  app.post('/token/redeem', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({ from: addressSchema, amount: amountSchema }).parse(req.body);
      const tx = await token.write.burnFrom([body.from as `0x${string}`, BigInt(body.amount)]);
      return { tx };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Redemption failed' });
    }
  });

  app.get('/token/balance/:addr', async (req, reply) => {
    try {
      const { addr } = req.params as { addr: string };
      if (!isAddress(addr)) return reply.code(400).send({ error: 'Invalid Ethereum address' });
      const bal = await token.read.balanceOf([addr as `0x${string}`]);
      return { balance: bal.toString() };
    } catch (err: any) {
      reply.code(500).send({ error: err.message ?? 'Balance lookup failed' });
    }
  });
}
