# ── Stage 1: install all deps (build + prod) ──────────────────────────────────
FROM node:20-alpine AS deps
RUN npm install -g pnpm@9.6.0
WORKDIR /app

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

# ── Stage 3: production deps only (no pnpm needed in runner) ──────────────────
FROM node:20-alpine AS prod-deps
RUN npm install -g pnpm@9.6.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter @ots/api --prod

# ── Stage 4: slim production image ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
