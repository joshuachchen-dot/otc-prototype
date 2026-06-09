import { FastifyRequest, FastifyReply } from 'fastify';
import { ENV } from '../env.js';

// Build the set of valid keys once at startup.
// Supports API_KEYS (comma-separated, multi-client) and legacy API_KEY (single).
function buildValidKeys(): Set<string> {
  const keys = new Set<string>();
  if (ENV.API_KEY)  keys.add(ENV.API_KEY);
  if (ENV.API_KEYS) ENV.API_KEYS.split(',').map(k => k.trim()).filter(Boolean).forEach(k => keys.add(k));
  return keys;
}

const VALID_KEYS = buildValidKeys();

/**
 * Fastify preHandler that enforces X-Api-Key header authentication.
 * Fail-closed in production: rejects all requests if no keys are configured.
 * In dev (NODE_ENV != production) with no keys configured, auth is skipped.
 */
export async function requireApiKey(req: FastifyRequest, reply: FastifyReply) {
  if (VALID_KEYS.size === 0) {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(500).send({ error: 'Server misconfiguration: API_KEY is not set.' });
    }
    return;
  }
  const raw      = req.headers['x-api-key'];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (!provided || !VALID_KEYS.has(provided)) {
    return reply.code(401).send({ error: 'Unauthorized: missing or invalid X-Api-Key header' });
  }
}
