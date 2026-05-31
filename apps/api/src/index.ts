import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ENV } from './env.js';
import health from './routes/health.js';
import kyc from './routes/kyc.js';
import nav from './routes/nav.js';
import token from './routes/token.js';
import risk from './routes/risk.js';
import audit from './routes/audit.js';
import market from './routes/market.js';
import otc from './routes/otc.js';
import sanctions from './routes/sanctions.js';
import { startNavScheduler } from './jobs/navScheduler.js';

// Global BigInt -> string fallback so JSON.stringify never throws on BigInt values
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = Fastify({ logger: true });

// ── Security headers (helmet) ─────────────────────────────────────────────────
// Sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.
// CSP is disabled here; enable and configure it if a UI is co-hosted on this origin.
await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
});

// ── CORS ─────────────────────────────────────────────────────────────────────
// Origin is env-configurable so staging/prod can restrict to their actual domain.
const allowedOrigin = ENV.CORS_ORIGIN ?? 'http://localhost:3000';
await app.register(cors, {
  origin: allowedOrigin,
  methods: ['GET', 'POST'],
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Applies globally; default 60 req/min/IP, configurable via RATE_LIMIT_RPM.
await app.register(rateLimit, {
  max:        ENV.RATE_LIMIT_RPM,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: (_req, context) => ({
    error: `Rate limit exceeded — max ${context.max} requests per minute`,
  }),
});

// ── Routes ───────────────────────────────────────────────────────────────────
await app.register(health);
await app.register(kyc);
await app.register(nav);
await app.register(token);
await app.register(risk);
await app.register(audit);
await app.register(market);
await app.register(otc);
await app.register(sanctions);

// ── Global error handler ──────────────────────────────────────────────────────
app.setErrorHandler((err, _req, reply) => {
  app.log.error(err);
  const statusCode = err.statusCode ?? 500;
  reply.code(statusCode).send({ error: err.message ?? 'Internal server error' });
});

await app.listen({ port: ENV.PORT, host: process.env.HOST ?? '0.0.0.0' });

// Start autonomous NAV scheduler after server is listening
startNavScheduler((msg) => app.log.info(msg));
