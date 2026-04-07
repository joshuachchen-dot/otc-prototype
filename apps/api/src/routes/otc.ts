import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAddress } from 'viem';
import { otcTrade, token, nav } from '../chain';

const addressSchema = z.string().refine(isAddress, 'Invalid Ethereum address');
const amountSchema  = z.string().regex(/^\d+$/, 'amount must be a non-negative integer string');

// Status enum mirror (matches OTCTrade.sol enum order)
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
      const idNum = BigInt(id);
      const raw = await otcTrade.read.getTrade([idNum]);
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
  // Body: { seller, buyer, amount, navFloor }
  app.post('/otc/propose', async (req, reply) => {
    try {
      const body = z.object({
        seller:   addressSchema,
        buyer:    addressSchema,
        amount:   amountSchema,
        navFloor: amountSchema,
      }).parse(req.body);

      const tx = await otcTrade.write.propose([
        body.seller   as `0x${string}`,
        body.buyer    as `0x${string}`,
        BigInt(body.amount),
        BigInt(body.navFloor),
      ]);

      // Read back the new trade id (tradeCount - 1)
      const count = await otcTrade.read.tradeCount();
      const id = Number(count) - 1;
      return { tx, id };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Propose failed' });
    }
  });

  // ── POST /otc/settle ───────────────────────────────────────────────────────
  // Body: { id }
  // Returns 200 with tx on success.
  // Returns 409 with the on-chain revert reason on condition failure.
  app.post('/otc/settle', async (req, reply) => {
    try {
      const { id } = z.object({ id: z.number().int().nonnegative() }).parse(req.body);
      const tx = await otcTrade.write.settle([BigInt(id)]);
      return { tx };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });

      // Extract the on-chain revert reason so the UI can show exactly which
      // condition failed (SELLER_INSUFFICIENT_BALANCE or NAV_BELOW_FLOOR)
      const reason: string =
        err.cause?.reason ??
        err.shortMessage ??
        err.message ??
        'Settlement failed';

      reply.code(409).send({ error: reason });
    }
  });

  // ── POST /otc/cancel ───────────────────────────────────────────────────────
  // Body: { id, reason? }
  app.post('/otc/cancel', async (req, reply) => {
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
  // Convenience endpoint: mint tokens to seller and post a specific NAV so the
  // UI can set up each of the 3 test scenarios with one click.
  // Body: { scenario: 1 | 2 | 3, seller, buyer }
  app.post('/otc/setup-scenario', async (req, reply) => {
    try {
      const body = z.object({
        scenario: z.literal(1).or(z.literal(2)).or(z.literal(3)),
        seller:   addressSchema,
        buyer:    addressSchema,
      }).parse(req.body);

      const { scenario, seller, buyer } = body;
      const results: string[] = [];

      // Trade amount used in all scenarios: 500 OTCF (500 * 1e18)
      const TRADE_AMOUNT = 500n * 10n ** 18n;

      if (scenario === 1) {
        // Scenario 1: SUCCESS
        // Seller receives 1000 OTCF (well above trade amount)
        // NAV posted at $3,000 (above navFloor of $2,000)
        const mintTx = await token.write.mint([seller as `0x${string}`, 1000n * 10n ** 18n]);
        results.push(`Minted 1000 OTCF to seller (tx: ${mintTx})`);

        const navTx = await nav.write.postNAV([
          3_000_000_000n,                          // $3,000 × 1e6
          BigInt(Math.floor(Date.now() / 1000)),
        ]);
        results.push(`Posted NAV = $3,000 (tx: ${navTx})`);

      } else if (scenario === 2) {
        // Scenario 2: SELL-SIDE FAIL — seller has too few tokens
        // Mint only 100 OTCF to seller (below trade amount of 500)
        const mintTx = await token.write.mint([seller as `0x${string}`, 100n * 10n ** 18n]);
        results.push(`Minted 100 OTCF to seller (tx: ${mintTx}) — below trade amount of 500`);

        const navTx = await nav.write.postNAV([
          3_000_000_000n,
          BigInt(Math.floor(Date.now() / 1000)),
        ]);
        results.push(`Posted NAV = $3,000 (tx: ${navTx}) — NAV is fine, sell-side will fail`);

      } else {
        // Scenario 3: BUY-SIDE FAIL — NAV below floor
        // Seller has enough tokens (1000 OTCF)
        const mintTx = await token.write.mint([seller as `0x${string}`, 1000n * 10n ** 18n]);
        results.push(`Minted 1000 OTCF to seller (tx: ${mintTx})`);

        // Post NAV at $1,500 (below navFloor of $2,000)
        const navTx = await nav.write.postNAV([
          1_500_000_000n,                          // $1,500 × 1e6
          BigInt(Math.floor(Date.now() / 1000)),
        ]);
        results.push(`Posted NAV = $1,500 (tx: ${navTx}) — below navFloor of $2,000`);
      }

      return { scenario, steps: results };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Setup failed' });
    }
  });
}
