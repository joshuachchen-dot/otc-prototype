import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// ── Mock env with known AML limits ────────────────────────────────────────────
const AML_MAX_TX       = 10_000n * 10n ** 18n;
const AML_VELOCITY_24H = 50_000n * 10n ** 18n;

jest.unstable_mockModule('../src/env', () => ({
  ENV: {
    RPC_URL: 'http://localhost:8545',
    PRIVATE_KEY: '0x' + 'a'.repeat(64),
    FUND_TOKEN_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    NAV_REGISTRY_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    OTC_TRADE_ADDRESS: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    PORT: 3001,
    AML_MAX_TX,
    AML_VELOCITY_24H,
  },
}));

// ── Mock db/client — null (in-memory path) ────────────────────────────────────
jest.unstable_mockModule('../src/db/client', () => ({ db: null }));

const ALICE = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const BOB   = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

let amlCheckSize:     (amount: bigint) => void;
let amlCheckVelocity: (address: string, amount: bigint) => Promise<void>;
let amlRecord:        (address: string, amount: bigint) => Promise<void>;
let AML_WINDOW_MS:    number;
let _ledger:          Map<string, { amount: bigint; ts: number }[]>;

beforeAll(async () => {
  const mod = await import('../src/db/aml.js');
  amlCheckSize     = mod.amlCheckSize;
  amlCheckVelocity = mod.amlCheckVelocity;
  amlRecord        = mod.amlRecord;
  AML_WINDOW_MS    = mod.AML_WINDOW_MS;
  _ledger          = mod._ledger;
});

beforeEach(() => {
  _ledger.clear();
});

// ── amlCheckSize ─────────────────────────────────────────────────────────────

describe('amlCheckSize', () => {
  it('passes for amount at the cap', () => {
    expect(() => amlCheckSize(AML_MAX_TX)).not.toThrow();
  });

  it('throws AML_SIZE_EXCEEDED for amount one wei above the cap', () => {
    expect(() => amlCheckSize(AML_MAX_TX + 1n)).toThrow('AML_SIZE_EXCEEDED');
  });

  it('passes for zero amount', () => {
    expect(() => amlCheckSize(0n)).not.toThrow();
  });
});

// ── amlCheckVelocity ─────────────────────────────────────────────────────────

describe('amlCheckVelocity', () => {
  it('passes when ledger is empty', async () => {
    await expect(amlCheckVelocity(ALICE, 1000n)).resolves.toBeUndefined();
  });

  it('passes when cumulative total equals the velocity limit', async () => {
    await amlRecord(ALICE, AML_VELOCITY_24H - 1000n);
    await expect(amlCheckVelocity(ALICE, 1000n)).resolves.toBeUndefined();
  });

  it('throws AML_VELOCITY_EXCEEDED when cumulative total would exceed the limit', async () => {
    await amlRecord(ALICE, AML_VELOCITY_24H - 999n);
    await expect(amlCheckVelocity(ALICE, 1000n)).rejects.toThrow('AML_VELOCITY_EXCEEDED');
  });

  it('is independent per address — Alice exceeding limit does not affect Bob', async () => {
    await amlRecord(ALICE, AML_VELOCITY_24H);
    await expect(amlCheckVelocity(BOB, AML_MAX_TX)).resolves.toBeUndefined();
  });

  it('is case-insensitive for address comparison', async () => {
    await amlRecord(ALICE.toLowerCase(), AML_VELOCITY_24H - 999n);
    await expect(amlCheckVelocity(ALICE.toUpperCase(), 1000n)).rejects.toThrow('AML_VELOCITY_EXCEEDED');
  });

  it('excludes records older than the rolling window', async () => {
    const old = Date.now() - AML_WINDOW_MS - 1;
    _ledger.set(ALICE.toLowerCase(), [{ amount: AML_VELOCITY_24H, ts: old }]);
    await expect(amlCheckVelocity(ALICE, AML_MAX_TX)).resolves.toBeUndefined();
  });
});

// ── amlRecord ────────────────────────────────────────────────────────────────

describe('amlRecord', () => {
  it('accumulates amounts for the same address', async () => {
    await amlRecord(ALICE, 1000n);
    await amlRecord(ALICE, 2000n);
    await expect(amlCheckVelocity(ALICE, AML_VELOCITY_24H - 3000n)).resolves.toBeUndefined();
    await expect(amlCheckVelocity(ALICE, AML_VELOCITY_24H - 3000n + 1n)).rejects.toThrow('AML_VELOCITY_EXCEEDED');
  });

  it('prunes stale records on write', async () => {
    const old = Date.now() - AML_WINDOW_MS - 1;
    _ledger.set(ALICE.toLowerCase(), [{ amount: AML_VELOCITY_24H, ts: old }]);
    await amlRecord(ALICE, 1n);
    const records = _ledger.get(ALICE.toLowerCase())!;
    expect(records).toHaveLength(1);
    expect(records[0].amount).toBe(1n);
  });
});
