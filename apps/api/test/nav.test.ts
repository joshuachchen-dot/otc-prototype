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
  },
}));

// ── Mock chain BEFORE any dynamic import that loads chain.ts / env.ts ────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockLatestNAV = jest.fn() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPostNAV = jest.fn() as any;

jest.unstable_mockModule('../src/chain', () => ({
  nav: {
    read: { latestNAV: mockLatestNAV },
    write: { postNAV: mockPostNAV },
  },
}));

const TX_HASH = '0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  const { default: navRoutes } = await import('../src/routes/nav.js');
  await app.register(navRoutes);
  await app.ready();
});

afterAll(() => app.close());

// ── GET /nav/latest ──────────────────────────────────────────────────────────

describe('GET /nav/latest', () => {
  it('returns stringified nav, asOf, storedAt', async () => {
    mockLatestNAV.mockResolvedValueOnce([
      BigInt('123456789'),
      BigInt('1710000000'),
      BigInt('1710003600'),
    ]);

    const res = await app.inject({ method: 'GET', url: '/nav/latest' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      nav: '123456789',
      asOf: '1710000000',
      storedAt: '1710003600',
    });
  });

  it('returns "0" values when contract returns zeroes', async () => {
    mockLatestNAV.mockResolvedValueOnce([0n, 0n, 0n]);

    const res = await app.inject({ method: 'GET', url: '/nav/latest' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ nav: '0', asOf: '0', storedAt: '0' });
  });

  it('returns 500 when latestNAV throws (e.g. NO_NAV revert)', async () => {
    mockLatestNAV.mockRejectedValueOnce(Object.assign(new Error('NO_NAV'), { shortMessage: 'NO_NAV' }));

    const res = await app.inject({ method: 'GET', url: '/nav/latest' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toHaveProperty('error', 'NO_NAV');
  });

  it('returns 500 and falls back to err.message when shortMessage absent', async () => {
    mockLatestNAV.mockRejectedValueOnce(new Error('RPC timeout'));

    const res = await app.inject({ method: 'GET', url: '/nav/latest' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('RPC timeout');
  });
});

// ── POST /nav/post ───────────────────────────────────────────────────────────

describe('POST /nav/post', () => {
  it('calls nav.write.postNAV and returns tx hash', async () => {
    mockPostNAV.mockResolvedValueOnce(TX_HASH as `0x${string}`);

    const res = await app.inject({
      method: 'POST',
      url: '/nav/post',
      payload: { nav: '123456789', asOf: 1710000000 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tx: TX_HASH });
    expect(mockPostNAV).toHaveBeenCalledWith([BigInt('123456789'), BigInt(1710000000)]);
  });

  it('returns 400 when nav is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nav/post',
      payload: { asOf: 1710000000 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toHaveProperty('error');
  });

  it('returns 400 when nav contains non-digit characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nav/post',
      payload: { nav: '12.34', asOf: 1710000000 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when asOf is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nav/post',
      payload: { nav: '100' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when asOf is not a positive integer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nav/post',
      payload: { nav: '100', asOf: -1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when asOf is a float', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nav/post',
      payload: { nav: '100', asOf: 1.5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when postNAV throws', async () => {
    mockPostNAV.mockRejectedValueOnce(Object.assign(new Error('access denied'), { shortMessage: 'AccessControl' }));

    const res = await app.inject({
      method: 'POST',
      url: '/nav/post',
      payload: { nav: '100', asOf: 1710000000 },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('AccessControl');
  });
});
