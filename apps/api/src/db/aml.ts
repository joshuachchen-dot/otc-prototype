// AML monitoring — rolling-window velocity tracker.
// Uses Postgres when DATABASE_URL is set (survives restarts); falls back to
// an in-memory Map for dev/demo. Replace with Redis for high-throughput prod.
import { db } from './client.js';
import { ENV } from '../env.js';

// Rolling window duration in milliseconds.
export const AML_WINDOW_MS = 24 * 60 * 60 * 1_000;

type TxRecord = { amount: bigint; ts: number };

// In-memory fallback store (used when DATABASE_URL is absent).
export const _ledger = new Map<string, TxRecord[]>();

function prune(records: TxRecord[], now: number): TxRecord[] {
  return records.filter(r => now - r.ts < AML_WINDOW_MS);
}

/**
 * Throws `AML_SIZE_EXCEEDED` if amount exceeds the per-transaction cap.
 * Cap is read from ENV.AML_MAX_TX (default 10,000 OTCF).
 */
export function amlCheckSize(amount: bigint): void {
  if (amount > ENV.AML_MAX_TX) {
    throw new Error('AML_SIZE_EXCEEDED');
  }
}

/**
 * Throws `AML_VELOCITY_EXCEEDED` if adding `amount` to the address's 24h
 * rolling total would exceed ENV.AML_VELOCITY_24H (default 50,000 OTCF).
 * Uses Postgres when available; falls back to in-memory.
 */
export async function amlCheckVelocity(address: string, amount: bigint): Promise<void> {
  const addr = address.toLowerCase();

  if (db) {
    const cutoff = new Date(Date.now() - AML_WINDOW_MS).toISOString();
    const { rows } = await db.query<{ total: string }>(
      `select coalesce(sum(amount), 0)::text as total
         from aml_transactions
        where address = $1 and ts >= $2`,
      [addr, cutoff],
    );
    const total = BigInt(rows[0]?.total ?? '0') + amount;
    if (total > ENV.AML_VELOCITY_24H) throw new Error('AML_VELOCITY_EXCEEDED');
    return;
  }

  // In-memory path
  const now   = Date.now();
  const valid = prune(_ledger.get(addr) ?? [], now);
  const total = valid.reduce((s, r) => s + r.amount, 0n) + amount;
  if (total > ENV.AML_VELOCITY_24H) throw new Error('AML_VELOCITY_EXCEEDED');
}

/**
 * Writes an AML alert to audit_log (Postgres) or stderr (in-memory fallback).
 * Call when an AML check throws before returning 403 to the caller.
 */
export async function amlAlert(
  address: string,
  reason: string,
  context: Record<string, unknown>,
): Promise<void> {
  const payload = { address: address.toLowerCase(), reason, ...context };
  if (db) {
    await db.query(
      `insert into audit_log (actor, action, payload)
       values ($1, 'AML_ALERT', $2::jsonb)`,
      [address.toLowerCase(), JSON.stringify(payload)],
    );
    return;
  }
  // Fallback: structured stderr so log aggregators can still pick it up
  process.stderr.write(JSON.stringify({ level: 'WARN', event: 'AML_ALERT', ...payload }) + '\n');
}

/**
 * Records a completed transaction for future velocity checks.
 * Call after the on-chain transaction succeeds.
 */
export async function amlRecord(address: string, amount: bigint): Promise<void> {
  const addr = address.toLowerCase();

  if (db) {
    await db.query(
      'insert into aml_transactions (address, amount) values ($1, $2)',
      [addr, amount.toString()],
    );
    return;
  }

  // In-memory path
  const now   = Date.now();
  const valid = prune(_ledger.get(addr) ?? [], now);
  valid.push({ amount, ts: now });
  _ledger.set(addr, valid);
}
