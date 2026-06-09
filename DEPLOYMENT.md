# Deployment Guide — Archon

Three supported paths. **Vercel + Railway** is recommended for the fastest live URL.

---

## Option A — Vercel (web) + Railway (API + DB) ✅ Recommended

**Cost:** Free for Vercel · ~$5/month for Railway  
**Time:** ~20 minutes  
**Result:** `https://archon.vercel.app` (or custom domain)

### Step 1 — Push to GitHub
Ensure the repo is pushed to GitHub (already done — `joshuachen-coder/prototype_claude`).

### Step 2 — Deploy the API on Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select `joshuachen-coder/prototype_claude`
3. Railway will detect the `apps/api/railway.toml` config automatically
4. Add a **PostgreSQL** plugin: click **+ New** → **Database → PostgreSQL**
5. Set these environment variables in Railway's dashboard (Variables tab):

```
NODE_ENV=production
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=0xYOUR_SEPOLIA_PRIVATE_KEY
CHAIN_ID=11155111
CHAIN_NAME=Sepolia
FUND_TOKEN_ADDRESS=0x5A9d4dCccEC853c7C15b95c7c0A41128b5fc8600
NAV_REGISTRY_ADDRESS=0xdE637CB46c9974837d10081fcB0212e3D6Fe7073
OTC_TRADE_ADDRESS=0x8cFF7e7b115a299fbD8c974911d74495D53FCC5D
API_KEY=<generate: openssl rand -hex 32>
CORS_ORIGIN=https://your-vercel-url.vercel.app
DATABASE_URL=<Railway auto-fills this from the PostgreSQL plugin>
```

6. Railway deploys automatically. Note the generated URL (e.g. `https://archon-api.railway.app`).

### Step 3 — Deploy the web UI on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import `joshuachen-coder/prototype_claude`
3. Set **Root Directory** to `apps/web`
4. Vercel detects Next.js automatically
5. Add these environment variables:

```
NEXT_PUBLIC_API_URL=https://archon-api.railway.app
NEXT_PUBLIC_API_KEY=<same key you set in Railway>
AUTH_SECRET=<generate: openssl rand -hex 32>
NEXTAUTH_URL=https://your-vercel-url.vercel.app
NEXTAUTH_SECRET=<generate: openssl rand -hex 32>
```

6. Click **Deploy**. Your live URL is ready in ~2 minutes.

### Step 4 — Update Railway CORS
Go back to Railway → set `CORS_ORIGIN` to your actual Vercel URL, then redeploy.

---

## Option B — Railway only (API + Web + DB)

**Cost:** ~$10/month (two services + database)  
**Time:** ~25 minutes

Same as Option A but deploy the web UI as a second Railway service instead of Vercel.

1. Follow Step 1 and Step 2 above.
2. In Railway, add a **second service** from the same repo.
3. In the new service settings:
   - **Root Directory:** leave as repo root
   - **Build Command:** `pnpm install --frozen-lockfile --filter @ots/web && pnpm --filter @ots/web run build`
   - **Start Command:** `node apps/web/.next/standalone/apps/web/server.js`
4. Add the same web environment variables as Step 3 above.
5. Set `CORS_ORIGIN` on the API service to point at the web service URL.

---

## Option C — Render (free tier)

**Cost:** Free (slower cold starts after inactivity)  
**Time:** ~30 minutes  
**Result:** `https://archon-web.onrender.com`

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo — Render detects `render.yaml` automatically
3. Fill in the `sync: false` environment variables when prompted:
   - `RPC_URL`, `PRIVATE_KEY`, `FUND_TOKEN_ADDRESS`, `NAV_REGISTRY_ADDRESS`, `OTC_TRADE_ADDRESS`
   - `API_KEY` (generate with `openssl rand -hex 32`)
   - `CORS_ORIGIN` = the web service URL Render assigns
   - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET` (for web service)
   - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_KEY` (for web service)
4. Click **Apply**. Both services + PostgreSQL deploy together.

⚠️ Free tier services spin down after 15 minutes of inactivity. First request after sleep takes ~30s.

---

## Custom Domain (any platform)

Once deployed, point `demo.archon.com` (or similar) at your platform:

1. Buy/configure domain via Cloudflare, Namecheap, etc.
2. In Vercel: **Project Settings → Domains → Add**  
   In Railway: **Service Settings → Networking → Custom Domain**  
   In Render: **Service Settings → Custom Domains**
3. Add the CNAME record your platform gives you to your DNS provider
4. Update `NEXTAUTH_URL` and `CORS_ORIGIN` env vars to use the custom domain
5. Redeploy

---

## Secrets Checklist

Generate fresh values for production — never reuse dev secrets:

```bash
# API key (shared between API and web)
openssl rand -hex 32

# Auth secret (web JWT signing)
openssl rand -hex 32

# NextAuth secret
openssl rand -hex 32
```

Generate a **fresh Sepolia private key** for production:
```bash
# In a Node REPL or script:
node -e "const {generatePrivateKey} = require('viem/accounts'); console.log(generatePrivateKey())"
```
Then fund the new address with Sepolia ETH from a faucet and transfer the SETTLEMENT_AGENT_ROLE to it.

---

## Verifying the Deployment

Once live, confirm these endpoints respond:

```bash
# API health
curl https://your-api-url/health

# Latest NAV (should return live Sepolia data)
curl https://your-api-url/nav/latest

# Web UI (should return HTML)
curl -I https://your-web-url
```

Then log in at `https://your-web-url/login` with the demo credentials.
