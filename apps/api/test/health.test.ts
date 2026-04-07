import Fastify from 'fastify';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';

// health.ts has no chain/env dependencies — import directly
let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  const { default: health } = await import('../src/routes/health.js');
  await app.register(health);
  await app.ready();
});

afterAll(() => app.close());

describe('GET /health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('returns Content-Type application/json', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
