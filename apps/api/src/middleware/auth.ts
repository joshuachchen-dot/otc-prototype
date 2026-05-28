import { FastifyRequest, FastifyReply } from 'fastify';
import { ENV } from '../env.js';

/**
 * Fastify preHandler that enforces X-Api-Key header authentication.
 * When API_KEY is not set in the environment, auth is skipped (dev mode).
 * In any deployed environment, set API_KEY to a strong secret.
 */
export async function requireApiKey(req: FastifyRequest, reply: FastifyReply) {
  if (!ENV.API_KEY) return;
  const provided = req.headers['x-api-key'];
  if (provided !== ENV.API_KEY) {
    return reply.code(401).send({ error: 'Unauthorized: missing or invalid X-Api-Key header' });
  }
}
