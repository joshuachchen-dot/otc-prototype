import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAddress } from 'viem';
import { otcTrade, token, nav } from '../chain.js';
import { requireApiKey } from '../middleware/auth.js';
import { kycIsEligible } from '../db/kyc.js';
import { amlCheckSize, amlCheckVelocity, amlRecord, amlAlert } from '../db/aml.js';

const addressSchema = z.string().refine(isAddress, 'Invalid Ethereum address');
const amountSchema  = z.string().regex(/^\d+$/, 'amount must be a non-negative integer string');

const STATUS_LABELS = ['Pending', 'Settled', 'Cancelled'] as const;

function formatTrade(raw: readonly [string, string, bigint, bigint, number]) {
  const [seller, buyer, amount, navFloor, status] = raw;
  return {
    seller,
    buyer,
    amount:   amount.toString(),
    navFloor: navFloor.toString(),
    status:   STATUS_LABELS[status] ?? 'Unknown',
  };
}

export default async function (app: FastifyInstance) {
  // ── GET /otc/trade/:id ─────────────────────────────────────────────────────
  app.get('/otc/trade/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const raw = await otcTrade.read.getTrade([BigInt(id)]);
      return formatTrade(raw);
    } catch (err: any) {
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Lookup failed' });
    }
  });

  // ── GET /otc/trades ────────────────────────────────────────────────────────
  app.get('/otc/trades', async (_req, reply) => {
    try {
      const count = await otcTrade.read.tradeCount();
      const all = await Promise.all(
        Array.from({ length: Number(count) }, (_, i) =>
          otcTrade.read.getTrade([BigInt(i)]).then((raw) => ({ id: i, ...formatTrade(raw) }))
        )
      );
      return all;
    } catch (err: any) {
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Lookup failed' });
    }
  });

  // ── POST /otc/propose ──────────────────────────────────────────────────────
  app.post('/otc/propose', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({
        seller:   addressSchema,
        buyer:    addressSchema,
        amount:   amountSchema,
        navFloor: amountSchema,
        // EIP-712 seller consent fields
        nonce:    z.coerce.bigint(),
        deadline: z.coerce.bigint(),
        v:        z.number().int().min(27).max(28),
        r:        z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid r'),
        s:        z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid s'),
      }).parse(req.body);

      if (!await kycIsEligible(body.buyer)) {
        return reply.code(403).send({ error: 'KYC_NOT_ELIGIBLE: buyer address has not completed KYC' });
      }
      if (!await kycIsEligible(body.seller)) {
        return reply.code(403).send({ error: 'KYC_NOT_ELIGIBLE: seller address has not completed KYC' });
      }

      const amt = BigInt(body.amount);
      amlCheckSize(amt);
      await amlCheckVelocity(body.seller, amt);
      await amlCheckVelocity(body.buyer,  amt);

      const tx = await otcTrade.write.propose([
        body.seller   as `0x${string}`,
        body.buyer    as `0x${string}`,
        amt,
        BigInt(body.navFloor),
        body.nonce,
        body.deadline,
        body.v,
        body.r as `0x${string}`,
        body.s as `0x${string}`,
      ]);
      await amlRecord(body.seller, amt);
      await amlRecord(body.buyer,  amt);

      const count = await otcTrade.read.tradeCount();
      const id = Number(count) - 1;
      return { tx, id };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      if (err.message?.startsWith('AML_')) {
        const b = req.body as any;
        await amlAlert(b?.seller ?? b?.buyer ?? '', err.message, { route: 'propose', seller: b?.seller, buyer: b?.buyer });
        return reply.code(403).send({ error: err.message });
      }
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Propose failed' });
    }
  });

  // ── POST /otc/settle ───────────────────────────────────────────────────────
  app.post('/otc/settle', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const { id } = z.object({ id: z.number().int().nonnegative() }).parse(req.body);
      const tx = await otcTrade.write.settle([BigInt(id)]);
      return { tx };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });

      const reason: string =
        err.cause?.reason ??
        err.shortMessage ??
        err.message ??
        'Settlement failed';

      reply.code(409).send({ error: reason });
    }
  });

  // ── POST /otc/cancel ───────────────────────────────────────────────────────
  app.post('/otc/cancel', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({
        id:     z.number().int().nonnegative(),
        reason: z.string().default('manual cancel'),
      }).parse(req.body);

      const tx = await otcTrade.write.cancel([BigInt(body.id), body.reason]);
      return { tx };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Cancel failed' });
    }
  });

  // ── POST /otc/setup-scenario ───────────────────────────────────────────────
  app.post('/otc/setup-scenario', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({
        scenario: z.literal(1).or(z.literal(2)).or(z.literal(3)),
        seller:   addressSchema,
        buyer:    addressSchema,
      }).parse(req.body);

      const { scenario, seller, buyer } = body;
      const results: string[] = [];

      // Reset seller balance so each scenario starts from a known state.
      // Without this, leftover tokens from prior runs accumulate and can
      // cause the Scenario 2 balance check to pass when it should fail.
      const existing = await token.read.balanceOf([seller as `0x${string}`]);
      if (existing > 0n) {
        await token.write.burnFrom([seller as `0x${string}`, existing]);
        results.push(`Reset seller balance (burned ${existing / 10n ** 18n} OTCF)`);
      }

      if (scenario === 1) {
        const mintTx = await token.write.mint([seller as `0x${string}`, 1000n * 10n ** 18n]);
        results.push(`Minted 1000 OTCF to seller (tx: ${mintTx})`);
        const navTx = await nav.write.postNAV([3_000_000_000n, BigInt(Math.floor(Date.now() / 1000))]);
        results.push(`Posted NAV = $3,000 (tx: ${navTx})`);
      } else if (scenario === 2) {
        const mintTx = await token.write.mint([seller as `0x${string}`, 100n * 10n ** 18n]);
        results.push(`Minted 100 OTCF to seller (tx: ${mintTx}) — below trade amount of 500`);
        const navTx = await nav.write.postNAV([3_000_000_000n, BigInt(Math.floor(Date.now() / 1000))]);
        results.push(`Posted NAV = $3,000 (tx: ${navTx}) — NAV is fine, sell-side will fail`);
      } else {
        const mintTx = await token.write.mint([seller as `0x${string}`, 1000n * 10n ** 18n]);
        results.push(`Minted 1000 OTCF to seller (tx: ${mintTx})`);
        const navTx = await nav.write.postNAV([1_500_000_000n, BigInt(Math.floor(Date.now() / 1000))]);
        results.push(`Posted NAV = $1,500 (tx: ${navTx}) — below navFloor of $2,000`);
      }

      return { scenario, steps: results };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Setup failed' });
    }
  });
}
