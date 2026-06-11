import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

const SELLER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const BUYER  = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';

// ── Mock env so requireApiKey is a no-op and otc.ts has the fields it reads ──
jest.unstable_mockModule('../src/env', () => ({
  ENV: {
    RPC_URL: 'http://localhost:8545',
    CHAIN_ID: 31337,
    OTC_TRADE_ADDRESS: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  },
}));

// ── Mock the on-chain client so no real RPC calls are made ──────────────────
const mockGetTrade = jest.fn() as any;
const mockSettle   = jest.fn() as any;

jest.unstable_mockModule('../src/chain', () => ({
  otcTrade: {
    read:  { getTrade: mockGetTrade, nonces: jest.fn(), tradeCount: jest.fn() },
    write: { settle: mockSettle, propose: jest.fn(), cancel: jest.fn() },
  },
  token: {
    read:  { balanceOf: jest.fn() },
    write: { setWhitelisted: jest.fn(), mint: jest.fn(), burnFrom: jest.fn() },
  },
  nav:     { write: { postNAV: jest.fn() } },
  rpc:     { waitForTransactionReceipt: jest.fn() },
  chain:   {},
  account: {},
  wallet:  {},
}));

// ── Mock KYC / sanctions / AML so settle's compliance re-checks are testable ─
const mockKycIsEligible = jest.fn() as any;
jest.unstable_mockModule('../src/db/kyc', () => ({
  kycIsEligible: mockKycIsEligible,
  kycMark:       jest.fn(),
  kycGet:        jest.fn(),
}));

class MockSanctionsHit extends Error {
  constructor(address: string, reason: string) {
    super(`SANCTIONS_HIT: ${address} — ${reason}`);
    this.name = 'SanctionsHit';
  }
}
const mockSanctionsCheck = jest.fn() as any;
jest.unstable_mockModule('../src/db/sanctions', () => ({
  sanctionsCheck: mockSanctionsCheck,
  SanctionsHit:   MockSanctionsHit,
  sanctionsBlock: jest.fn(),
}));

jest.unstable_mockModule('../src/db/aml', () => ({
  amlCheckSize:     jest.fn(),
  amlCheckVelocity: jest.fn(),
  amlRecord:        jest.fn(),
  amlAlert:         jest.fn(),
}));

const tradeRaw = (seller: string, buyer: string) =>
  [seller, buyer, 500n * 10n ** 18n, 2_000_000_000n, BigInt(Math.floor(Date.now() / 1000)), 0] as const;

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  const { default: otcRoutes } = await import('../src/routes/otc.js');
  await app.register(otcRoutes);
  await app.ready();
});

afterAll(() => app.close());

beforeEach(() => {
  mockGetTrade.mockReset();
  mockSettle.mockReset();
  mockKycIsEligible.mockReset();
  mockSanctionsCheck.mockReset();

  mockKycIsEligible.mockResolvedValue(true);
  mockSanctionsCheck.mockResolvedValue(undefined);
  mockSettle.mockResolvedValue('0xsettletxhash');
});

// ── POST /otc/settle ──────────────────────────────────────────────────────────

describe('POST /otc/settle', () => {
  it('settles once both parties pass the KYC + sanctions re-check', async () => {
    mockGetTrade.mockResolvedValueOnce(tradeRaw(SELLER, BUYER));

    const res = await app.inject({ method: 'POST', url: '/otc/settle', payload: { id: 0 } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tx: '0xsettletxhash' });
    expect(mockGetTrade).toHaveBeenCalledWith([0n]);
    expect(mockKycIsEligible).toHaveBeenCalledWith(SELLER);
    expect(mockKycIsEligible).toHaveBeenCalledWith(BUYER);
    expect(mockSanctionsCheck).toHaveBeenCalledWith(SELLER);
    expect(mockSanctionsCheck).toHaveBeenCalledWith(BUYER);
    expect(mockSettle).toHaveBeenCalledWith([0n]);
  });

  it('returns 403 and blocks settlement when the seller fails KYC re-check', async () => {
    mockGetTrade.mockResolvedValueOnce(tradeRaw(SELLER, BUYER));
    mockKycIsEligible.mockImplementation(async (addr: string) => addr !== SELLER);

    const res = await app.inject({ method: 'POST', url: '/otc/settle', payload: { id: 0 } });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/KYC_NOT_ELIGIBLE/);
    expect(res.json().error).toMatch(/seller/);
    expect(mockSettle).not.toHaveBeenCalled();
  });

  it('returns 403 and blocks settlement when the buyer fails KYC re-check', async () => {
    mockGetTrade.mockResolvedValueOnce(tradeRaw(SELLER, BUYER));
    mockKycIsEligible.mockImplementation(async (addr: string) => addr !== BUYER);

    const res = await app.inject({ method: 'POST', url: '/otc/settle', payload: { id: 0 } });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/KYC_NOT_ELIGIBLE/);
    expect(res.json().error).toMatch(/buyer/);
    expect(mockSettle).not.toHaveBeenCalled();
  });

  it('returns 403 and blocks settlement when either party hits the sanctions list', async () => {
    mockGetTrade.mockResolvedValueOnce(tradeRaw(SELLER, BUYER));
    mockSanctionsCheck.mockImplementation(async (addr: string) => {
      if (addr === SELLER) throw new MockSanctionsHit(addr, 'OFAC static blocklist');
    });

    const res = await app.inject({ method: 'POST', url: '/otc/settle', payload: { id: 0 } });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/SANCTIONS_HIT/);
    expect(mockSettle).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid body without touching the chain or compliance checks', async () => {
    const res = await app.inject({ method: 'POST', url: '/otc/settle', payload: { id: 'not-a-number' } });

    expect(res.statusCode).toBe(400);
    expect(mockGetTrade).not.toHaveBeenCalled();
    expect(mockKycIsEligible).not.toHaveBeenCalled();
  });

  it('returns 409 with the revert reason when on-chain settlement fails', async () => {
    mockGetTrade.mockResolvedValueOnce(tradeRaw(SELLER, BUYER));
    mockSettle.mockRejectedValueOnce({ shortMessage: 'execution reverted: NAV stale' });

    const res = await app.inject({ method: 'POST', url: '/otc/settle', payload: { id: 0 } });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('execution reverted: NAV stale');
  });
});
