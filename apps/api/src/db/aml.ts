// AML monitoring — in-memory rolling-window velocity tracker.
// No external dependency: the ledger resets on server restart, which is
// acceptable for a prototype. Replace with a persistent store (Redis / Postgres)
// before going to production.

// Maximum tokens allowed in a single transaction (10,000 OTCF, 18 decimals).
export const AML_MAX_TX_AMOUNT  = 10_000n * 10n ** 18n;

// Maximum tokens allowed per address per rolling 24-hour window.
export const AML_VELOCITY_LIMIT = 50_000n * 10n ** 18n;

// Rolling window duration in milliseconds.
export const AML_WINDOW_MS = 24 * 60 * 60 * 1_000;

type TxRecord = { amount: bigint; ts: number };

// Exported for tests — allows direct inspection and reset.
export const _ledger = new Map<string, TxRecord[]>();

function prune(records: TxRecord[], now: number): TxRecord[] {
  return records.filter(r => now - r.ts < AML_WINDOW_MS);
}

/**
 * Throws `AML_SIZE_EXCEEDED` if amount exceeds the single-transaction cap.
 */
export function amlCheckSize(amount: bigint): void {
  if (amount > AML_MAX_TX_AMOUNT) {
    throw new Error('AML_SIZE_EXCEEDED');
  }
}

/**
 * Throws `AML_VELOCITY_EXCEEDED` if adding `amount` to the address's 24h
 * rolling total would exceed the velocity limit.
 */
export function amlCheckVelocity(address: string, amount: bigint): void {
  const addr  = address.toLowerCase();
  const now   = Date.now();
  const valid = prune(_ledger.get(addr) ?? [], now);
  const total = valid.reduce((s, r) => s + r.amount, 0n) + amount;
  if (total > AML_VELOCITY_LIMIT) {
    throw new Error('AML_VELOCITY_EXCEEDED');
  }
}

/**
 * Records a completed transaction for future velocity checks.
 * Call after the on-chain transaction succeeds.
 */
export function amlRecord(address: string, amount: bigint): void {
  const addr  = address.toLowerCase();
  const now   = Date.now();
  const valid = prune(_ledger.get(addr) ?? [], now);
  valid.push({ amount, ts: now });
  _ledger.set(addr, valid);
}
