# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN npm install -g pnpm@9.6.0
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter @ots/api

# ── Stage 2: build TypeScript ─────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY package.json pnpm-workspace.yaml ./

WORKDIR /app/apps/api
RUN node ../../node_modules/.bin/tsc --project tsconfig.json

# ── Stage 3: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.6.0
WORKDIR /app

ENV NODE_ENV=production

# Only production deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @ots/api --prod

# Compiled output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

# Fail fast if required env vars are missing (validated inside env.ts at startup)
CMD ["node", "apps/api/dist/index.js"]
