import { db } from './client.js';

// In-memory store used when DATABASE_URL is not configured (dev/demo)
const mem = new Map<string, { eligible: boolean; vcHash: string | null }>();

export async function kycIsEligible(address: string): Promise<boolean> {
  const addr = address.toLowerCase();
  if (db) {
    const { rows } = await db.query('select eligible from investors where address=$1', [addr]);
    return rows[0]?.eligible === true;
  }
  return mem.get(addr)?.eligible === true;
}

export async function kycMark(address: string, vcHash?: string): Promise<void> {
  const addr = address.toLowerCase();
  if (db) {
    await db.query(
      'insert into investors(address, eligible, vc_hash) values($1, true, $2) on conflict (address) do update set eligible=true, vc_hash=excluded.vc_hash',
      [addr, vcHash ?? null],
    );
    return;
  }
  mem.set(addr, { eligible: true, vcHash: vcHash ?? null });
}

export async function kycGet(address: string): Promise<{ eligible: boolean; vc_hash: string | null } | null> {
  const addr = address.toLowerCase();
  if (db) {
    const { rows } = await db.query('select eligible, vc_hash from investors where address=$1', [addr]);
    return rows[0] ?? null;
  }
  const rec = mem.get(addr);
  return rec ? { eligible: rec.eligible, vc_hash: rec.vcHash ?? null } : null;
}
