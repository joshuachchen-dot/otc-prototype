import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// ── Mock env to strip API_KEY so requireApiKey is a no-op in tests ──────────
jest.unstable_mockModule('../src/env', () => ({
  ENV: {
    RPC_URL: 'http://localhost:8545',
    PRIVATE_KEY: '0x' + 'a'.repeat(64),
    FUND_TOKEN_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    NAV_REGISTRY_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    OTC_TRADE_ADDRESS: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    PORT: 3001,
    // API_KEY intentionally absent — disables requireApiKey in tests
  },
}));

// ── Mock chain BEFORE any dynamic import that transitively loads chain.ts / env.ts ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMint = jest.fn() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockBurnFrom = jest.fn() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockBalanceOf = jest.fn() as any;

jest.unstable_mockModule('../src/chain', () => ({
  token: {
    write: { mint: mockMint, burnFrom: mockBurnFrom },
    read: { balanceOf: mockBalanceOf },
  },
}));

// ── Mock KYC — eligible by default; individual tests override as needed ──────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockKycIsEligible = jest.fn() as any;
mockKycIsEligible.mockResolvedValue(true);

jest.unstable_mockModule('../src/db/kyc', () => ({
  kycIsEligible: mockKycIsEligible,
}));

// ── Mock AML — all checks pass by default; individual tests override ─────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAmlCheckSize     = jest.fn() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAmlCheckVelocity = jest.fn() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAmlRecord        = jest.fn() as any;

jest.unstable_mockModule('../src/db/aml', () => ({
  amlCheckSize:     mockAmlCheckSize,
  amlCheckVelocity: mockAmlCheckVelocity,
  amlRecord:        mockAmlRecord,
}));

const VALID_ADDR = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TX_HASH = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  const { default: tokenRoutes } = await import('../src/routes/token.js');
  await app.register(tokenRoutes);
  await app.ready();
});

afterAll(() => app.close());

beforeEach(() => {
  mockMint.mockReset();
  mockBurnFrom.mockReset();
  mockBalanceOf.mockReset();
  mockKycIsEligible.mockReset();
  mockKycIsEligible.mockResolvedValue(true);
  mockAmlCheckSize.mockReset();
  mockAmlCheckVelocity.mockReset();
  mockAmlRecord.mockReset();
});

// ── POST /token/subscribe ────────────────────────────────────────────────────

describe('POST /token/subscribe', () => {
  it('calls token.write.mint and returns tx hash', async () => {
    mockMint.mockResolvedValueOnce(TX_HASH as `0x${string}`);

    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { to: VALID_ADDR, amount: '1000000000000000000' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tx: TX_HASH });
    expect(mockMint).toHaveBeenCalledWith([VALID_ADDR, BigInt('1000000000000000000')]);
  });

  it('returns 400 when "to" is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { amount: '100' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toHaveProperty('error');
  });

  it('returns 400 when address is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { to: 'not-an-address', amount: '100' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when amount is not a digit string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { to: VALID_ADDR, amount: '-50' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when amount contains decimals', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { to: VALID_ADDR, amount: '1.5' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 403 when address is not KYC-eligible', async () => {
    mockKycIsEligible.mockResolvedValueOnce(false);

    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { to: VALID_ADDR, amount: '1000000000000000000' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/KYC_NOT_ELIGIBLE/);
    expect(mockMint).not.toHaveBeenCalled();
  });

  it('returns 500 when mint throws', async () => {
    mockMint.mockRejectedValueOnce(new Error('on-chain revert'));

    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { to: VALID_ADDR, amount: '100' },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toHaveProperty('error');
  });

  it('returns 403 when AML size cap is exceeded on subscribe', async () => {
    mockAmlCheckSize.mockImplementationOnce(() => { throw new Error('AML_SIZE_EXCEEDED'); });

    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { to: VALID_ADDR, amount: '100' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('AML_SIZE_EXCEEDED');
    expect(mockMint).not.toHaveBeenCalled();
  });

  it('returns 403 when AML velocity limit is exceeded on subscribe', async () => {
    mockAmlCheckVelocity.mockImplementationOnce(() => { throw new Error('AML_VELOCITY_EXCEEDED'); });

    const res = await app.inject({
      method: 'POST',
      url: '/token/subscribe',
      payload: { to: VALID_ADDR, amount: '100' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('AML_VELOCITY_EXCEEDED');
    expect(mockMint).not.toHaveBeenCalled();
  });
});

// ── POST /token/redeem ───────────────────────────────────────────────────────

describe('POST /token/redeem', () => {
  it('calls token.write.burnFrom and returns tx hash', async () => {
    mockBurnFrom.mockResolvedValueOnce(TX_HASH as `0x${string}`);

    const res = await app.inject({
      method: 'POST',
      url: '/token/redeem',
      payload: { from: VALID_ADDR, amount: '500000000000000000' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tx: TX_HASH });
    expect(mockBurnFrom).toHaveBeenCalledWith([VALID_ADDR, BigInt('500000000000000000')]);
  });

  it('returns 400 when "from" is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/token/redeem',
      payload: { amount: '100' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when address is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/token/redeem',
      payload: { from: '0xnope', amount: '100' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when burnFrom throws', async () => {
    mockBurnFrom.mockRejectedValueOnce(new Error('insufficient balance'));

    const res = await app.inject({
      method: 'POST',
      url: '/token/redeem',
      payload: { from: VALID_ADDR, amount: '100' },
    });
    expect(res.statusCode).toBe(500);
  });

  it('returns 403 when AML size cap is exceeded on redeem', async () => {
    mockAmlCheckSize.mockImplementationOnce(() => { throw new Error('AML_SIZE_EXCEEDED'); });

    const res = await app.inject({
      method: 'POST',
      url: '/token/redeem',
      payload: { from: VALID_ADDR, amount: '100' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('AML_SIZE_EXCEEDED');
    expect(mockBurnFrom).not.toHaveBeenCalled();
  });

  it('returns 403 when AML velocity limit is exceeded on redeem', async () => {
    mockAmlCheckVelocity.mockImplementationOnce(() => { throw new Error('AML_VELOCITY_EXCEEDED'); });

    const res = await app.inject({
      method: 'POST',
      url: '/token/redeem',
      payload: { from: VALID_ADDR, amount: '100' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('AML_VELOCITY_EXCEEDED');
    expect(mockBurnFrom).not.toHaveBeenCalled();
  });
});

// ── GET /token/balance/:addr ─────────────────────────────────────────────────

describe('GET /token/balance/:addr', () => {
  it('returns stringified balance', async () => {
    mockBalanceOf.mockResolvedValueOnce(BigInt('2500000000000000000'));

    const res = await app.inject({
      method: 'GET',
      url: `/token/balance/${VALID_ADDR}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ balance: '2500000000000000000' });
    expect(mockBalanceOf).toHaveBeenCalledWith([VALID_ADDR]);
  });

  it('returns "0" for zero balance', async () => {
    mockBalanceOf.mockResolvedValueOnce(0n);

    const res = await app.inject({
      method: 'GET',
      url: `/token/balance/${VALID_ADDR}`,
    });
    expect(res.json()).toEqual({ balance: '0' });
  });

  it('returns 400 for an invalid address param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/token/balance/not-valid',
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when balanceOf throws', async () => {
    mockBalanceOf.mockRejectedValueOnce(new Error('RPC error'));

    const res = await app.inject({
      method: 'GET',
      url: `/token/balance/${VALID_ADDR}`,
    });
    expect(res.statusCode).toBe(500);
  });
});
