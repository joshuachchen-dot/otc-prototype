import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ENV } from './env';
import health from './routes/health';
import kyc from './routes/kyc';
import nav from './routes/nav';
import token from './routes/token';
import risk from './routes/risk';
import audit from './routes/audit';
import market from './routes/market';
import otc from './routes/otc';
import { startNavScheduler } from './jobs/navScheduler';

// Global BigInt -> string fallback so JSON.stringify never throws on BigInt values
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = Fastify({ logger: true });

await app.register(cors, { origin: 'http://localhost:3000' });

await app.register(health);
await app.register(kyc);
await app.register(nav);
await app.register(token);
await app.register(risk);
await app.register(audit);
await app.register(market);
await app.register(otc);

// Global error handler - catches unhandled route errors and returns structured JSON
app.setErrorHandler((err, _req, reply) => {
  app.log.error(err);
  const statusCode = err.statusCode ?? 500;
  reply.code(statusCode).send({ error: err.message ?? 'Internal server error' });
});

await app.listen({ port: ENV.PORT, host: '127.0.0.1' });

// Start autonomous NAV scheduler after server is listening
startNavScheduler((msg) => app.log.info(msg));
