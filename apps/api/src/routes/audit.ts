import { FastifyInstance } from 'fastify';
import { parseAbiItem } from 'viem';
import { rpc } from '../chain.js';
import { ENV } from '../env.js';
import { requireApiKey } from '../middleware/auth.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default async function (app: FastifyInstance) {
  app.get('/audit/export', { preHandler: requireApiKey }, async (_req, reply) => {
    try {
      const [navLogs, transferLogs] = await Promise.all([
        rpc.getLogs({
          address: ENV.NAV_REGISTRY_ADDRESS,
          event: parseAbiItem('event NavPosted(uint256 nav, uint256 asOf, uint256 storedAt, address indexed by)'),
          fromBlock: 0n,
        }),
        rpc.getLogs({
          address: ENV.FUND_TOKEN_ADDRESS,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
          fromBlock: 0n,
        }),
      ]);

      type Row = { type: string; blockNumber: bigint; ts: string; details: string };
      const rows: Row[] = [];

      for (const log of navLogs) {
        const { nav, asOf, storedAt } = log.args as { nav: bigint; asOf: bigint; storedAt: bigint };
        rows.push({
          type: 'NAV',
          blockNumber: log.blockNumber ?? 0n,
          ts: storedAt.toString(),
          details: JSON.stringify({ nav: nav.toString(), asOf: asOf.toString() }),
        });
      }

      // Collect MINT/BURN rows; ts filled in after block timestamp fetch
      const mintBurnRows: Row[] = [];
      for (const log of transferLogs) {
        const { from, to, value } = log.args as { from: string; to: string; value: bigint };
        const fromNorm = from.toLowerCase();
        const toNorm   = to.toLowerCase();

        if (fromNorm === ZERO_ADDRESS) {
          mintBurnRows.push({
            type: 'MINT',
            blockNumber: log.blockNumber ?? 0n,
            ts: '0',
            details: JSON.stringify({ to, amount: value.toString() }),
          });
        } else if (toNorm === ZERO_ADDRESS) {
          mintBurnRows.push({
            type: 'BURN',
            blockNumber: log.blockNumber ?? 0n,
            ts: '0',
            details: JSON.stringify({ from, amount: value.toString() }),
          });
        }
      }

      // Batch-fetch block timestamps for all unique MINT/BURN block numbers
      const uniqueBlocks = [...new Set(mintBurnRows.map(r => r.blockNumber))];
      const blockTimestamps = new Map<bigint, string>();

      await Promise.all(
        uniqueBlocks.map(async (blockNumber) => {
          const block = await rpc.getBlock({ blockNumber });
          blockTimestamps.set(blockNumber, block.timestamp.toString());
        })
      );

      for (const row of mintBurnRows) {
        row.ts = blockTimestamps.get(row.blockNumber) ?? '0';
        rows.push(row);
      }

      rows.sort((a, b) => (a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : 0));

      const header = 'type,blockNumber,ts,details';
      const csv = [
        header,
        ...rows.map(r => `${r.type},${r.blockNumber},${r.ts},"${r.details.replace(/"/g, '""')}"`),
      ].join('\n');

      reply.type('text/csv').header('Content-Disposition', 'attachment; filename="audit.csv"').send(csv);
    } catch (err: any) {
      reply.code(500).send({ error: err.message ?? 'Failed to export audit log' });
    }
  });
}
