// Sanctions screening — checks addresses against a local blocklist and an
// optional external provider (Chainalysis, Elliptic, etc.).
//
// Integration point: set SANCTIONS_API_URL + SANCTIONS_API_KEY in env to route
// checks through your screening provider. The provider must accept a POST body
// of { address } and return { blocked: boolean, reason?: string }.
import { ENV } from '../env.js';
import { db } from './client.js';

// Addresses known to be OFAC-sanctioned for local/offline testing.
// In production this list is superseded by the external API.
const STATIC_BLOCKLIST = new Set<string>([
  '0x7f367cc41522ce07553e823bf3be79a889debe1b', // OFAC example — Lazarus Group
  '0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b',
]);

export class SanctionsHit extends Error {
  constructor(address: string, reason: string) {
    super(`SANCTIONS_HIT: ${address} — ${reason}`);
    this.name = 'SanctionsHit';
  }
}

/**
 * Throws `SanctionsHit` if the address is on any sanctions list.
 * Checks: (1) static OFAC blocklist, (2) DB blocklist if available,
 * (3) external provider if SANCTIONS_API_URL is configured.
 */
export async function sanctionsCheck(address: string): Promise<void> {
  const addr = address.toLowerCase();

  if (STATIC_BLOCKLIST.has(addr)) {
    throw new SanctionsHit(addr, 'OFAC static blocklist');
  }

  if (db) {
    const { rows } = await db.query<{ reason: string }>(
      `select reason from sanctions_blocklist where address = $1 and active = true`,
      [addr],
    );
    if (rows.length > 0) {
      throw new SanctionsHit(addr, rows[0].reason ?? 'DB blocklist');
    }
  }

  if (ENV.SANCTIONS_API_URL) {
    const resp = await fetch(ENV.SANCTIONS_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        ...(ENV.SANCTIONS_API_KEY ? { 'X-Api-Key': ENV.SANCTIONS_API_KEY } : {}),
      },
      body: JSON.stringify({ address: addr }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) {
      // Fail-open on provider errors to avoid blocking legitimate trades during outages.
      // Log the error so ops can investigate.
      process.stderr.write(JSON.stringify({
        level: 'WARN',
        event: 'SANCTIONS_PROVIDER_ERROR',
        status: resp.status,
        address: addr,
      }) + '\n');
      return;
    }
    const data = await resp.json() as { blocked?: boolean; reason?: string };
    if (data.blocked) {
      throw new SanctionsHit(addr, data.reason ?? 'provider');
    }
  }
}

/**
 * Adds an address to the DB blocklist. Idempotent.
 */
export async function sanctionsBlock(address: string, reason: string): Promise<void> {
  const addr = address.toLowerCase();
  if (db) {
    await db.query(
      `insert into sanctions_blocklist (address, reason, active)
       values ($1, $2, true)
       on conflict (address) do update set reason = excluded.reason, active = true`,
      [addr, reason],
    );
  }
}
