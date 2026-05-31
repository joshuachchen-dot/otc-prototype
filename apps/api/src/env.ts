// apps/api/src/env.ts
import * as dotenv from "dotenv";
import { z } from "zod";
import { isAddress, getAddress } from "viem";

/**
 * Explicitly load apps/api/.env
 * This avoids cwd / monorepo / tsx issues entirely.
 */
dotenv.config({ path: "./.env" });

const EnvSchema = z.object({
  RPC_URL: z.string().url(),
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
 * Debug log (safe)
 */
console.log("ENV LOADED:", {
  RPC_URL: ENV.RPC_URL,
  PRIVATE_KEY: ENV.PRIVATE_KEY.slice(0, 10) + "...",
  FUND_TOKEN_ADDRESS: ENV.FUND_TOKEN_ADDRESS,
  NAV_REGISTRY_ADDRESS: ENV.NAV_REGISTRY_ADDRESS,
  OTC_TRADE_ADDRESS: ENV.OTC_TRADE_ADDRESS,
  PORT: ENV.PORT,
});
