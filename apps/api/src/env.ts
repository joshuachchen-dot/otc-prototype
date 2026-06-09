// apps/api/src/env.ts
import * as dotenv from "dotenv";
import { z } from "zod";
import { isAddress, getAddress } from "viem";

// Skip dotenv in Jest (NODE_ENV=test) — jest.setup.ts populates process.env directly
// so the .env file won't leak API_KEY or other secrets into unit tests.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: "./.env" });
}

const EnvSchema = z.object({
  RPC_URL: z.string().url(),
  // Identifies the network RPC_URL points to (Anvil = 31337, Sepolia = 11155111, mainnet = 1, ...).
  // Must match the RPC's actual chain ID or signed transactions will be rejected.
  CHAIN_ID: z.coerce.number().int().positive().default(31337),
  CHAIN_NAME: z.string().default('Anvil'),
  PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "Invalid private key"),
  FUND_TOKEN_ADDRESS: z.string().refine(isAddress, "Invalid address"),
  NAV_REGISTRY_ADDRESS: z.string().refine(isAddress, "Invalid address"),
  OTC_TRADE_ADDRESS: z.string().refine(isAddress, "Invalid address"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().optional(),
  // Comma-separated list of valid API keys. Supports multiple clients.
  // API_KEY (singular) is accepted for backward compatibility.
  // Leave unset in local dev; always set in any deployed environment.
  API_KEY:  z.string().min(16).optional(),
  API_KEYS: z.string().optional(),
  // Allowed CORS origin for the web app. Defaults to localhost in dev.
  CORS_ORIGIN: z.string().url().optional(),
  // Rate limit: max requests per minute per IP on sensitive routes.
  RATE_LIMIT_RPM: z.coerce.number().int().positive().default(60),
  // AML thresholds (token units, 18 decimals). Defaults: 10k and 50k OTCF.
  AML_MAX_TX:       z.coerce.bigint().default(10_000n * 10n ** 18n),
  AML_VELOCITY_24H: z.coerce.bigint().default(50_000n * 10n ** 18n),
  // Sanctions screening provider. Leave unset to use static blocklist only.
  // Provider must accept POST { address } and return { blocked, reason? }.
  SANCTIONS_API_URL: z.string().url().optional(),
  SANCTIONS_API_KEY: z.string().optional(),
});

/**
 * Parse & validate
 */
const raw = EnvSchema.parse(process.env);

/**
 * Normalize addresses (EIP-55 checksum)
 */
export const ENV = {
  ...raw,
  FUND_TOKEN_ADDRESS: getAddress(raw.FUND_TOKEN_ADDRESS),
  NAV_REGISTRY_ADDRESS: getAddress(raw.NAV_REGISTRY_ADDRESS),
  OTC_TRADE_ADDRESS: getAddress(raw.OTC_TRADE_ADDRESS),
};

/**
 * Production safety checks
 */
if (process.env.NODE_ENV === 'production') {
  if (!ENV.DATABASE_URL) {
    console.error(
      '\n🔴  FATAL: DATABASE_URL is not set in production.\n' +
      '   KYC eligibility and AML records require a persistent database.\n' +
      '   Set DATABASE_URL to a PostgreSQL connection string and restart.\n'
    );
    process.exit(1);
  }
  if (!ENV.API_KEY && !ENV.API_KEYS) {
    // requireApiKey already returns 500 for this case — belt-and-suspenders log
    console.error(
      '\n🔴  PRODUCTION ERROR: Neither API_KEY nor API_KEYS is set.\n' +
      '   All authenticated routes will return 500 until this is fixed.\n'
    );
  }
}

/**
 * Debug log (safe)
 */
console.log("ENV LOADED:", {
  RPC_URL: ENV.RPC_URL,
  PRIVATE_KEY: ENV.PRIVATE_KEY.slice(0, 10) + "...",
  FUND_TOKEN_ADDRESS: ENV.FUND_TOKEN_ADDRESS,
  NAV_REGISTRY_ADDRESS: ENV.NAV_REGISTRY_ADDRESS,
  OTC_TRADE_ADDRESS: ENV.OTC_TRADE_ADDRESS,
  PORT: ENV.PORT,
  DATABASE_URL: ENV.DATABASE_URL ? '(set)' : '(unset — using in-memory fallback)',
});
