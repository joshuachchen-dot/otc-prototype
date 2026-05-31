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
 * When no keys are configured, auth is skipped (dev mode).
 * In any deployed environment, set API_KEY or API_KEYS.
 */
export async function requireApiKey(req: FastifyRequest, reply: FastifyReply) {
  if (VALID_KEYS.size === 0) return;
  const raw      = req.headers['x-api-key'];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (!provided || !VALID_KEYS.has(provided)) {
    return reply.code(401).send({ error: 'Unauthorized: missing or invalid X-Api-Key header' });
  }
}
