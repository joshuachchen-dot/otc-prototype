import { nav } from '../chain.js';

const INTERVAL_MS = 60_000; // post every 60 seconds
const PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';

async function fetchEthUsd(): Promise<number | null> {
  try {
    const res = await fetch(PRICE_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { ethereum: { usd: number } };
    return data.ethereum.usd;
  } catch {
    return null;
  }
}

export function startNavScheduler(log: (msg: string) => void): () => void {
  log('[NavScheduler] Started — posting ETH/USD price as NAV every 60 s');

  const tick = async () => {
    const price = await fetchEthUsd();
    if (price === null) {
      log('[NavScheduler] Could not fetch ETH price, skipping');
      return;
    }

    // Store as integer: price in USD scaled by 10^6 (e.g. $3 000.12 → 3_000_120_000)
    const navValue = BigInt(Math.round(price * 1_000_000));
    const asOf     = BigInt(Math.floor(Date.now() / 1000));

    try {
      const tx = await nav.write.postNAV([navValue, asOf]);
      log(`[NavScheduler] NAV posted — price=$${price} navInt=${navValue} tx=${tx}`);
    } catch (err: any) {
      log(`[NavScheduler] postNAV failed: ${err.shortMessage ?? err.message}`);
    }
  };

  // Run immediately then on interval
  tick();
  const timer = setInterval(tick, INTERVAL_MS);

  // Return teardown function
  return () => clearInterval(timer);
}
