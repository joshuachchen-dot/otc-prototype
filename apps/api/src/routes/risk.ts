import { FastifyInstance } from 'fastify';

type RiskStatus = 'green' | 'yellow' | 'red';
const VALID_STATUSES: readonly RiskStatus[] = ['green', 'yellow', 'red'];

let status: RiskStatus = 'green';

export default async function (app: FastifyInstance) {
  app.get('/risk', async () => ({ status }));

  app.post('/risk/set/:s', async (req, reply) => {
    const { s } = req.params as { s: string };
    if (!VALID_STATUSES.includes(s as RiskStatus)) {
      return reply.code(400).send({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    status = s as RiskStatus;
    return { status };
  });
}
