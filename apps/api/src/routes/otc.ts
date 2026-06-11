import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isAddress, getAddress, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { otcTrade, token, nav, chain, rpc } from '../chain.js';
import { ENV } from '../env.js';
import { requireApiKey } from '../middleware/auth.js';
import { kycIsEligible, kycMark } from '../db/kyc.js';
import { amlCheckSize, amlCheckVelocity, amlRecord, amlAlert } from '../db/aml.js';
import { sanctionsCheck, SanctionsHit } from '../db/sanctions.js';

const addressSchema = z.string().refine(isAddress, 'Invalid Ethereum address');
const amountSchema  = z.string().regex(/^\d+$/, 'amount must be a non-negative integer string');

const STATUS_LABELS = ['Pending', 'Settled', 'Cancelled'] as const;

// Hardhat/Anvil's standard test account #1 — its private key is published in
// every Hardhat/Foundry "default accounts" list and is never used to hold real
// funds. The /otc demo scenarios use this address as their fixed "seller" so
// the page can produce the EIP-712 consent signature OTCTrade.propose() now
// requires without exposing any real-world key.
const SCENARIO_SELLER_ADDRESS = getAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
const SCENARIO_SELLER_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;

const PROPOSE_TYPES = {
  ProposeTrade: [
    { name: 'seller',   type: 'address' },
    { name: 'buyer',    type: 'address' },
    { name: 'amount',   type: 'uint256' },
    { name: 'navFloor', type: 'uint256' },
    { name: 'nonce',    type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

function formatTrade(raw: readonly [string, string, bigint, bigint, bigint, number]) {
  const [seller, buyer, amount, navFloor, proposedAt, status] = raw;
  return {
    seller,
    buyer,
    amount:     amount.toString(),
    navFloor:   navFloor.toString(),
    proposedAt: proposedAt.toString(),
    status:     STATUS_LABELS[status] ?? 'Unknown',
  };
}

export default async function (app: FastifyInstance) {
  // ── GET /otc/nonce/:address ────────────────────────────────────────────────
  app.get('/otc/nonce/:address', async (req, reply) => {
    try {
      const { address } = req.params as { address: string };
      if (!isAddress(address)) return reply.code(400).send({ error: 'Invalid Ethereum address' });
      const nonce = await otcTrade.read.nonces([address as `0x${string}`]);
      return { address, nonce: nonce.toString() };
    } catch (err: any) {
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Nonce lookup failed' });
    }
  });

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

  // ── POST /otc/sign-propose ─────────────────────────────────────────────────
  // Produces the EIP-712 "ProposeTrade" consent signature OTCTrade.propose()
  // requires from the seller. Only works for the fixed scenario seller address
  // (a published Hardhat/Anvil test account) — this exists purely so the /otc
  // demo page can exercise the full propose flow without a browser wallet.
  app.post('/otc/sign-propose', { preHandler: requireApiKey }, async (req, reply) => {
    try {
      const body = z.object({
        seller:   addressSchema,
        buyer:    addressSchema,
        amount:   amountSchema,
        navFloor: amountSchema,
      }).parse(req.body);

      if (getAddress(body.seller) !== SCENARIO_SELLER_ADDRESS) {
        return reply.code(400).send({ error: 'Signing helper only supports the fixed scenario seller address' });
      }

      const account = privateKeyToAccount(SCENARIO_SELLER_PK);
      const signer = createWalletClient({ account, chain, transport: http(ENV.RPC_URL) });

      const nonce    = await otcTrade.read.nonces([body.seller as `0x${string}`]);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const signature = await signer.signTypedData({
        account,
        domain: {
          name: 'OTCTrade',
          version: '1',
          chainId: ENV.CHAIN_ID,
          verifyingContract: ENV.OTC_TRADE_ADDRESS,
        },
        types: PROPOSE_TYPES,
        primaryType: 'ProposeTrade',
        message: {
          seller:   body.seller as `0x${string}`,
          buyer:    body.buyer  as `0x${string}`,
          amount:   BigInt(body.amount),
          navFloor: BigInt(body.navFloor),
          nonce,
          deadline,
        },
      });

      return {
        nonce:    nonce.toString(),
        deadline: deadline.toString(),
        v: parseInt(signature.slice(130, 132), 16),
        r: `0x${signature.slice(2, 66)}`,
        s: `0x${signature.slice(66, 130)}`,
      };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.message ?? 'Signing failed' });
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
      await sanctionsCheck(body.seller);
      await sanctionsCheck(body.buyer);

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

      // Wait for the transaction to mine and extract the real trade id from the
      // TradeProposed event (topic[1]). Reading tradeCount() immediately after
      // broadcasting is a race — the tx may not be mined yet, returning a stale
      // count and therefore the wrong id.
      const receipt = await rpc.waitForTransactionReceipt({ hash: tx });
      // keccak256("TradeProposed(uint256,address,address,uint256,uint256)")
      const TRADE_PROPOSED_TOPIC =
        '0x504de33a229e9c7bbf845206f79e83b35839b5a6bba894fc00074d5ad8c7708b';
      const proposedLog = receipt.logs.find(l =>
        l.address.toLowerCase() === ENV.OTC_TRADE_ADDRESS.toLowerCase() &&
        l.topics[0] === TRADE_PROPOSED_TOPIC
      );
      if (!proposedLog) {
        app.log.warn({ tx, receipt: receipt.transactionHash }, 'TradeProposed event not found in receipt — id will be -1. Verify TRADE_PROPOSED_TOPIC matches the deployed contract.');
      }
      // topics[1] is the indexed id (padded 32-byte hex)
      const id = proposedLog?.topics[1] ? Number(BigInt(proposedLog.topics[1])) : -1;
      return { tx, id };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      if (err instanceof SanctionsHit) return reply.code(403).send({ error: err.message });
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

      // Re-validate KYC eligibility and sanctions status at settlement time.
      // Up to MAX_TRADE_AGE (7 days) may have elapsed since propose(), during
      // which either party's eligibility or sanctions status can change.
      const [seller, buyer] = await otcTrade.read.getTrade([BigInt(id)]);

      if (!await kycIsEligible(seller)) {
        return reply.code(403).send({ error: 'KYC_NOT_ELIGIBLE: seller address has not completed KYC' });
      }
      if (!await kycIsEligible(buyer)) {
        return reply.code(403).send({ error: 'KYC_NOT_ELIGIBLE: buyer address has not completed KYC' });
      }
      await sanctionsCheck(seller);
      await sanctionsCheck(buyer);

      const tx = await otcTrade.write.settle([BigInt(id)]);
      return { tx };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      if (err instanceof SanctionsHit) return reply.code(403).send({ error: err.message });

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

      // Cancel any pending trades involving the scenario seller so orphaned
      // proposals from prior runs don't accumulate in the feed.
      const tradeCount = await otcTrade.read.tradeCount();
      for (let i = 0; i < Number(tradeCount); i++) {
        const raw = await otcTrade.read.getTrade([BigInt(i)]);
        const isPending = raw[5] === 0;
        const involvesSeller = raw[0].toLowerCase() === seller.toLowerCase();
        if (isPending && involvesSeller) {
          const cancelTx = await otcTrade.write.cancel([BigInt(i), 'superseded by new scenario run']);
          await rpc.waitForTransactionReceipt({ hash: cancelTx });
          results.push(`Cancelled stale pending trade #${i}`);
        }
      }

      // Ensure both parties are on-chain whitelisted AND API-level KYC-marked.
      // Each write awaits its receipt before the next to avoid nonce collisions
      // with the NavScheduler, which broadcasts from the same wallet concurrently.
      const wlTx1 = await token.write.setWhitelisted([seller as `0x${string}`, true]);
      await rpc.waitForTransactionReceipt({ hash: wlTx1 });
      const wlTx2 = await token.write.setWhitelisted([buyer  as `0x${string}`, true]);
      await rpc.waitForTransactionReceipt({ hash: wlTx2 });
      await kycMark(seller);
      await kycMark(buyer);
      results.push(`Whitelisted and KYC-marked seller and buyer`);

      // Reset seller balance so each scenario starts from a known state.
      const existing = await token.read.balanceOf([seller as `0x${string}`]);
      if (existing > 0n) {
        const burnTx = await token.write.burnFrom([seller as `0x${string}`, existing]);
        await rpc.waitForTransactionReceipt({ hash: burnTx });
        results.push(`Reset seller balance (burned ${existing / 10n ** 18n} OTCF)`);
      }

      if (scenario === 1) {
        const mintTx = await token.write.mint([seller as `0x${string}`, 1000n * 10n ** 18n]);
        await rpc.waitForTransactionReceipt({ hash: mintTx });
        results.push(`Minted 1000 OTCF to seller (tx: ${mintTx})`);
        const navTx = await nav.write.postNAV([3_000_000_000n, BigInt(Math.floor(Date.now() / 1000))]);
        await rpc.waitForTransactionReceipt({ hash: navTx });
        results.push(`Posted NAV = $3,000 (tx: ${navTx})`);
      } else if (scenario === 2) {
        const mintTx = await token.write.mint([seller as `0x${string}`, 100n * 10n ** 18n]);
        await rpc.waitForTransactionReceipt({ hash: mintTx });
        results.push(`Minted 100 OTCF to seller (tx: ${mintTx}) — below trade amount of 500`);
        const navTx = await nav.write.postNAV([3_000_000_000n, BigInt(Math.floor(Date.now() / 1000))]);
        await rpc.waitForTransactionReceipt({ hash: navTx });
        results.push(`Posted NAV = $3,000 (tx: ${navTx}) — NAV is fine, sell-side will fail`);
      } else {
        const mintTx = await token.write.mint([seller as `0x${string}`, 1000n * 10n ** 18n]);
        await rpc.waitForTransactionReceipt({ hash: mintTx });
        results.push(`Minted 1000 OTCF to seller (tx: ${mintTx})`);
        const navTx = await nav.write.postNAV([1_500_000_000n, BigInt(Math.floor(Date.now() / 1000))]);
        await rpc.waitForTransactionReceipt({ hash: navTx });
        results.push(`Posted NAV = $1,500 (tx: ${navTx}) — below navFloor of $2,000`);
      }

      return { scenario, steps: results };
    } catch (err: any) {
      if (err.name === 'ZodError') return reply.code(400).send({ error: err.issues });
      reply.code(500).send({ error: err.shortMessage ?? err.message ?? 'Setup failed' });
    }
  });
}
