import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  amlCheckSize,
  amlCheckVelocity,
  amlRecord,
  AML_MAX_TX_AMOUNT,
  AML_VELOCITY_LIMIT,
  AML_WINDOW_MS,
  _ledger,
} from '../src/db/aml.js';

const ALICE = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const BOB   = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

beforeEach(() => {
  _ledger.clear();
});

// ── amlCheckSize ─────────────────────────────────────────────────────────────

describe('amlCheckSize', () => {
  it('passes for amount at the cap', () => {
    expect(() => amlCheckSize(AML_MAX_TX_AMOUNT)).not.toThrow();
  });

  it('throws AML_SIZE_EXCEEDED for amount one wei above the cap', () => {
    expect(() => amlCheckSize(AML_MAX_TX_AMOUNT + 1n)).toThrow('AML_SIZE_EXCEEDED');
  });

  it('passes for zero amount', () => {
    expect(() => amlCheckSize(0n)).not.toThrow();
  });
});

// ── amlCheckVelocity ─────────────────────────────────────────────────────────

describe('amlCheckVelocity', () => {
  it('passes when ledger is empty', () => {
    expect(() => amlCheckVelocity(ALICE, 1000n)).not.toThrow();
  });

  it('passes when cumulative total equals the velocity limit', () => {
    amlRecord(ALICE, AML_VELOCITY_LIMIT - 1000n);
    expect(() => amlCheckVelocity(ALICE, 1000n)).not.toThrow();
  });

  it('throws AML_VELOCITY_EXCEEDED when cumulative total would exceed the limit', () => {
    amlRecord(ALICE, AML_VELOCITY_LIMIT - 999n);
    expect(() => amlCheckVelocity(ALICE, 1000n)).toThrow('AML_VELOCITY_EXCEEDED');
  });

  it('is independent per address — Alice exceeding limit does not affect Bob', () => {
    amlRecord(ALICE, AML_VELOCITY_LIMIT);
    expect(() => amlCheckVelocity(BOB, AML_MAX_TX_AMOUNT)).not.toThrow();
  });

  it('is case-insensitive for address comparison', () => {
    amlRecord(ALICE.toLowerCase(), AML_VELOCITY_LIMIT - 999n);
    expect(() => amlCheckVelocity(ALICE.toUpperCase(), 1000n)).toThrow('AML_VELOCITY_EXCEEDED');
  });

  it('excludes records older than the rolling window', () => {
    const old = Date.now() - AML_WINDOW_MS - 1;
    _ledger.set(ALICE.toLowerCase(), [{ amount: AML_VELOCITY_LIMIT, ts: old }]);

    // Old record is outside the window; fresh amount should be accepted
    expect(() => amlCheckVelocity(ALICE, AML_MAX_TX_AMOUNT)).not.toThrow();
  });
});

// ── amlRecord ────────────────────────────────────────────────────────────────

describe('amlRecord', () => {
  it('accumulates amounts for the same address', () => {
    amlRecord(ALICE, 1000n);
    amlRecord(ALICE, 2000n);

    // Next check should see 3000n already recorded
    expect(() => amlCheckVelocity(ALICE, AML_VELOCITY_LIMIT - 3000n)).not.toThrow();
    expect(() => amlCheckVelocity(ALICE, AML_VELOCITY_LIMIT - 3000n + 1n)).toThrow('AML_VELOCITY_EXCEEDED');
  });

  it('prunes stale records on write', () => {
    const old = Date.now() - AML_WINDOW_MS - 1;
    _ledger.set(ALICE.toLowerCase(), [{ amount: AML_VELOCITY_LIMIT, ts: old }]);

    amlRecord(ALICE, 1n);
    const records = _ledger.get(ALICE.toLowerCase())!;
    // Only the fresh record should remain after pruning
    expect(records).toHaveLength(1);
    expect(records[0].amount).toBe(1n);
  });
});
