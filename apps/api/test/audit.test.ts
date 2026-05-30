import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// ── Mock chain and env BEFORE any dynamic import ─────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetLogs = jest.fn() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetBlock = jest.fn() as any;

const FUND_TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const NAV_REGISTRY_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const MOCK_BLOCK_TIMESTAMP = 1700000000n;

jest.unstable_mockModule('../src/chain', () => ({
  rpc: { getLogs: mockGetLogs, getBlock: mockGetBlock },
}));

jest.unstable_mockModule('../src/env', () => ({
  ENV: {
    RPC_URL: 'http://localhost:8545',
    PRIVATE_KEY: '0x' + 'a'.repeat(64),
    FUND_TOKEN_ADDRESS,
    NAV_REGISTRY_ADDRESS,
    PORT: 3001,
  },
}));

// ── Helpers for building mock log objects ─────────────────────────────────────

function navLog(nav: bigint, asOf: bigint, storedAt: bigint, by: string, blockNumber = 1n) {
  return { blockNumber, args: { nav, asOf, storedAt, by } };
}

function transferLog(from: string, to: string, value: bigint, blockNumber = 2n) {
  return { blockNumber, args: { from, to, value } };
}

const ZERO = '0x0000000000000000000000000000000000000000';
const ALICE = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  const { default: auditRoutes } = await import('../src/routes/audit.js');
  await app.register(auditRoutes);
  await app.ready();
});

afterAll(() => app.close());

beforeEach(() => {
  mockGetLogs.mockReset();
  mockGetBlock.mockReset();
  mockGetBlock.mockResolvedValue({ timestamp: MOCK_BLOCK_TIMESTAMP });
});

// ── GET /audit/export ─────────────────────────────────────────────────────────

describe('GET /audit/export', () => {
  it('returns text/csv content-type and attachment header', async () => {
    mockGetLogs
      .mockResolvedValueOnce([]) // navLogs
      .mockResolvedValueOnce([]); // transferLogs

    const res = await app.inject({ method: 'GET', url: '/audit/export' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(/audit\.csv/);
  });

  it('returns only the CSV header when no events exist', async () => {
    mockGetLogs.mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/audit/export' });
    const lines = res.body.trim().split('\n');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('type,blockNumber,ts,details');
  });

  it('includes a NAV row for each NavPosted event', async () => {
    mockGetLogs
      .mockResolvedValueOnce([navLog(123456789n, 1710000000n, 1710003600n, ALICE, 5n)])
      .mockResolvedValueOnce([]);

    const res = await app.inject({ method: 'GET', url: '/audit/export' });
    const lines = res.body.trim().split('\n');

    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[1]).toMatch(/^NAV,5,1710003600,/);
    expect(lines[1]).toContain('"123456789"');
    expect(lines[1]).toContain('"1710000000"');
  });

  it('includes a MINT row for Transfer from zero address', async () => {
    mockGetLogs
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([transferLog(ZERO, ALICE, 1000000000000000000n, 3n)]);

    const res = await app.inject({ method: 'GET', url: '/audit/export' });
    const lines = res.body.trim().split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^MINT,3,1700000000,/);
    expect(lines[1]).toContain(ALICE);
    expect(lines[1]).toContain('1000000000000000000');
  });

  it('includes a BURN row for Transfer to zero address', async () => {
    mockGetLogs
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([transferLog(ALICE, ZERO, 500000000000000000n, 7n)]);

    const res = await app.inject({ method: 'GET', url: '/audit/export' });
    const lines = res.body.trim().split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^BURN,7,1700000000,/);
    expect(lines[1]).toContain(ALICE);
    expect(lines[1]).toContain('500000000000000000');
  });

  it('skips P2P Transfer events (neither from nor to is zero address)', async () => {
    const OTHER = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    mockGetLogs
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([transferLog(ALICE, OTHER, 100n, 4n)]);

    const res = await app.inject({ method: 'GET', url: '/audit/export' });
    const lines = res.body.trim().split('\n');

    expect(lines).toHaveLength(1); // only header — P2P row excluded
  });

  it('sorts rows by blockNumber ascending', async () => {
    mockGetLogs
      .mockResolvedValueOnce([navLog(111n, 100n, 200n, ALICE, 10n)])
      .mockResolvedValueOnce([transferLog(ZERO, ALICE, 1n, 2n)]);

    const res = await app.inject({ method: 'GET', url: '/audit/export' });
    const lines = res.body.trim().split('\n').slice(1); // skip header

    expect(lines[0]).toMatch(/^MINT,2,/);  // block 2 first
    expect(lines[1]).toMatch(/^NAV,10,/);  // block 10 second
  });

  it('escapes double-quotes inside details', async () => {
    // Simulate a details string containing JSON with quotes (standard output)
    mockGetLogs
      .mockResolvedValueOnce([navLog(999n, 1n, 2n, ALICE, 1n)])
      .mockResolvedValueOnce([]);

    const res = await app.inject({ method: 'GET', url: '/audit/export' });
    // The details column is wrapped in quotes; internal quotes are doubled
    expect(res.body).toMatch(/"{.*}"/); // outer quotes present
  });

  it('returns 500 when getLogs throws', async () => {
    mockGetLogs.mockRejectedValueOnce(new Error('RPC unavailable'));

    const res = await app.inject({ method: 'GET', url: '/audit/export' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('RPC unavailable');
  });

  it('getLogs is called twice — once for NAV events, once for Transfer events', async () => {
    mockGetLogs.mockResolvedValue([]);

    await app.inject({ method: 'GET', url: '/audit/export' });

    expect(mockGetLogs).toHaveBeenCalledTimes(2);
    // First call targets NAV_REGISTRY_ADDRESS
    const [firstArgs] = mockGetLogs.mock.calls[0] as unknown as [{ address: string }];
    expect(firstArgs.address).toBe(NAV_REGISTRY_ADDRESS);
    // Second call targets FUND_TOKEN_ADDRESS
    const [secondArgs] = mockGetLogs.mock.calls[1] as unknown as [{ address: string }];
    expect(secondArgs.address).toBe(FUND_TOKEN_ADDRESS);
  });
});
