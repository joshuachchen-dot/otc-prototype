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
let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  const { default: risk } = await import('../src/routes/risk.js');
  await app.register(risk);
  await app.ready();
});

afterAll(() => app.close());

describe('GET /risk', () => {
  it('returns default status "green"', async () => {
    const res = await app.inject({ method: 'GET', url: '/risk' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'green' });
  });
});

describe('POST /risk/set/:s', () => {
  it('sets status to "yellow" and returns it', async () => {
    const res = await app.inject({ method: 'POST', url: '/risk/set/yellow' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'yellow' });
  });

  it('persists the new status on subsequent GET /risk', async () => {
    await app.inject({ method: 'POST', url: '/risk/set/red' });
    const res = await app.inject({ method: 'GET', url: '/risk' });
    expect(res.json().status).toBe('red');
  });

  it('returns 400 for an invalid status', async () => {
    const res = await app.inject({ method: 'POST', url: '/risk/set/purple' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toHaveProperty('error');
  });

  it('returns 400 for an empty status segment', async () => {
    const res = await app.inject({ method: 'POST', url: '/risk/set/' });
    // Fastify treats /risk/set/ as a different route — expect 404 or 400
    expect([400, 404]).toContain(res.statusCode);
  });

  it('accepts all three valid statuses', async () => {
    for (const s of ['green', 'yellow', 'red'] as const) {
      const res = await app.inject({ method: 'POST', url: `/risk/set/${s}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: s });
    }
  });
});
