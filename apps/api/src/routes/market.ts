import { FastifyInstance } from 'fastify';

const COINGECKO =
  'https://api.coingecko.com/api/v3/simple/price' +
  '?ids=ethereum,bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true';

type PriceCache = {
  ethereum: { usd: number; change24h: number; marketCap: number };
  bitcoin:  { usd: number; change24h: number; marketCap: number };
  fetchedAt: number;
  stale?: boolean;
};

// In-memory cache — serves last known prices if CoinGecko is temporarily unreachable
let cache: PriceCache | null = null;

async function fetchFromCoinGecko(): Promise<PriceCache> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(COINGECKO, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
    const raw = await res.json() as Record<string, Record<string, number>>;

    return {
      ethereum: {
        usd:       raw.ethereum.usd,
        change24h: raw.ethereum.usd_24h_change,
        marketCap: raw.ethereum.usd_market_cap,
      },
      bitcoin: {
        usd:       raw.bitcoin.usd,
        change24h: raw.bitcoin.usd_24h_change,
        marketCap: raw.bitcoin.usd_market_cap,
      },
      fetchedAt: Math.floor(Date.now() / 1000),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function (app: FastifyInstance) {
  app.get('/market/prices', async (_req, reply) => {
    try {
      const fresh = await fetchFromCoinGecko();
      cache = fresh;
      return reply.send(fresh);
    } catch (err: any) {
      // Return stale cache with a flag rather than a hard 502
      if (cache) {
        return reply.send({ ...cache, stale: true });
      }
      reply.code(502).send({ error: err.message ?? 'Failed to fetch market data' });
    }
  });
}
