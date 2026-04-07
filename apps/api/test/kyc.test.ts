import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// ── Mock db/client BEFORE importing any route that uses it ───────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockQuery = jest.fn() as any;

jest.unstable_mockModule('../src/db/client', () => ({
  db: { query: mockQuery },
}));

const VALID_ADDR = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  const { default: kycRoutes } = await import('../src/routes/kyc.js');
  await app.register(kycRoutes);
  await app.ready();
});

afterAll(() => app.close());

beforeEach(() => {
  mockQuery.mockReset();
});

// ── POST /kyc/mark-eligible ──────────────────────────────────────────────────

describe('POST /kyc/mark-eligible', () => {
  it('upserts investor and returns { ok: true }', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({
      method: 'POST',
      url: '/kyc/mark-eligible',
      payload: { address: VALID_ADDR, vcHash: 'sha256:abc123' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    // address is lowercased before storage
    const [sql, params] = mockQuery.mock.calls[0] as unknown as [string, [string, string | null]];
    expect(params[0]).toBe(VALID_ADDR.toLowerCase());
    expect(params[1]).toBe('sha256:abc123');
    expect(sql).toMatch(/insert into investors/i);
  });

  it('stores null when vcHash is omitted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await app.inject({
      method: 'POST',
      url: '/kyc/mark-eligible',
      payload: { address: VALID_ADDR },
    });

    const [, params] = mockQuery.mock.calls[0] as unknown as [string, [string, null]];
    expect(params[1]).toBeNull();
  });

  it('returns 400 for an invalid Ethereum address', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/kyc/mark-eligible',
      payload: { address: 'not-an-address' },
    });
    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 400 when address is missing entirely', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/kyc/mark-eligible',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when db.query throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));

    const res = await app.inject({
      method: 'POST',
      url: '/kyc/mark-eligible',
      payload: { address: VALID_ADDR },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('connection refused');
  });
});

// ── GET /kyc/:address ────────────────────────────────────────────────────────

describe('GET /kyc/:address', () => {
  it('returns eligible status when investor found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ eligible: true, vc_hash: 'sha256:abc123' }] });

    const res = await app.inject({ method: 'GET', url: `/kyc/${VALID_ADDR}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ eligible: true, vc_hash: 'sha256:abc123' });
    const [, params] = mockQuery.mock.calls[0] as unknown as [string, [string]];
    expect(params[0]).toBe(VALID_ADDR.toLowerCase());
  });

  it('returns { eligible: false } when investor not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await app.inject({ method: 'GET', url: `/kyc/${VALID_ADDR}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ eligible: false });
  });

  it('returns 400 for an invalid address param', async () => {
    const res = await app.inject({ method: 'GET', url: '/kyc/0xbadaddr' });
    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 500 when db.query throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db timeout'));

    const res = await app.inject({ method: 'GET', url: `/kyc/${VALID_ADDR}` });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('db timeout');
  });
});

// ── DB-null guard (503 when DATABASE_URL missing) ────────────────────────────

describe('503 when db is null', () => {
  let appNoDB: FastifyInstance;

  beforeAll(async () => {
    // Override the mock so db is null for this sub-suite
    jest.unstable_mockModule('../src/db/client', () => ({ db: null }));
    appNoDB = Fastify({ logger: false });
    // Re-import route after remocking (resetModules is true in jest config)
    const { default: kycRoutes } = await import('../src/routes/kyc.js');
    await appNoDB.register(kycRoutes);
    await appNoDB.ready();
  });

  afterAll(() => appNoDB.close());

  it('returns 503 on POST /kyc/mark-eligible when db is null', async () => {
    const res = await appNoDB.inject({
      method: 'POST',
      url: '/kyc/mark-eligible',
      payload: { address: VALID_ADDR },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toMatch(/database not configured/i);
  });

  it('returns 503 on GET /kyc/:address when db is null', async () => {
    const res = await appNoDB.inject({ method: 'GET', url: `/kyc/${VALID_ADDR}` });
    expect(res.statusCode).toBe(503);
  });
});
