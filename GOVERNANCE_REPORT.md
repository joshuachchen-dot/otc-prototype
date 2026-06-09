# Enterprise Governance Report
> Generated: 2026-06-09 UTC (v4)
> Project: Archon — Institutional OTC Settlement Platform  
> Previous Report: 2026-06-09 (v3)

---

## Overall Readiness

**Score: ████████░░ 78/100** *(prev: ███████░░░ 77/100 · +1 pt)*

| Domain | Status | Score | Δ v3 | Δ May 28 |
|--------|--------|-------|------|----------|
| ⚖️ Legal & Compliance | 🟡 MEDIUM | ███████░░░ 74/100 | +2 | +52 |
| 🔐 Smart Contract Hardening | 🟡 MEDIUM | ███████░░░ 74/100 | 0 | +22 |
| 🏗️ Infrastructure & DevOps | 🟢 GOOD | █████████░ 88/100 | +3 | +60 |
| 🧩 Product Completeness | 🟡 MEDIUM | ████████░░ 81/100 | -3 | +47 |
| 📈 Go-to-Market | 🟡 MEDIUM | ███████░░░ 75/100 | +3 | +47 |

> ✅ Infrastructure & DevOps reaches 88 — highest domain score to date.  
> ⚠️ Product Completeness slid -3: newly discovered gap — NextAuth social login does not set the `archon_session` cookie, so social-authenticated users fail the Edge middleware check on protected routes.  
> ⚠️ GTM: `apps/web/components/Layout.tsx` still contains "OTC Fund Prototype" and "thesis prototype demonstration" copy visible on every page.

---

## ⚖️ Legal & Compliance

**Readiness: ███████░░░ 74/100 · prev: 72/100 · Δ: +2 · Status: 🟡 MEDIUM**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | Cookie missing `Secure` flag in production | 🔴 CRITICAL | ✅ FIXED — conditional `; Secure` when `NODE_ENV=production` |
| 2 | NextAuth secret diverging from custom auth secret | 🟠 HIGH | ✅ FIXED — both flows now use `AUTH_SECRET` only |
| 3 | KYC re-check at `/otc/settle` | 🔴 CRITICAL | 🔴 STILL ABSENT |
| 4 | Sanctions provider failure is fail-open | 🟡 MEDIUM | 🟡 STILL PRESENT |
| 5 | OTC cancel not audit-logged | 🟡 MEDIUM | 🟡 STILL ABSENT |

### Remaining Issues

#### 🔴 [CRITICAL] /otc/settle missing KYC + sanctions re-validation
No re-check of buyer/seller KYC eligibility or sanctions status at settlement time. A 7-day window exists between proposal and settlement during which status can change.

#### 🟡 [MEDIUM] Sanctions provider fail-open
External sanctions API errors silently return success — a provider outage allows blocked addresses through.

#### 🟡 [MEDIUM] Cancel endpoint not audit-logged
`/otc/cancel` has no `amlAlert()` call or audit log entry. Cancellations are invisible in the compliance CSV export.

### Score Justification
+2 from two security fixes: Secure cookie flag enforced in production, and AUTH_SECRET unified across custom JWT and NextAuth flows eliminating key-divergence risk. Three compliance gaps remain open and unchanged.

---

## 🔐 Smart Contract Hardening

**Readiness: ███████░░░ 74/100 · prev: 74/100 · Δ: 0 · Status: 🟡 MEDIUM**

No contract changes since v3. All controls verified intact:
- ✅ EIP-712 seller consent — DOMAIN_SEPARATOR, PROPOSE_TYPEHASH, signature + nonce verified
- ✅ SETTLEMENT_AGENT_ROLE enforced on `propose()` and `settle()`
- ✅ NAV floor check present in `settle()`
- ✅ MAX_NAV_AGE (24h) freshness check present
- ✅ MAX_TRADE_AGE (7 days) expiry enforced
- ✅ 49 test functions — no regression
- ⚠️ NAVRegistry `asOf` validation still absent (known open issue)
- ⚠️ No `navCeiling` — asymmetric price protection (known open issue)
- ⚠️ OTCTrade not independently pausable (known open issue)

### Score Justification
Score unchanged. No regressions found. Known open issues (NAV ceiling, asOf validation, OTCTrade pausable) remain and require dedicated smart contract work.

---

## 🏗️ Infrastructure & DevOps

**Readiness: █████████░ 88/100 · prev: 85/100 · Δ: +3 · Status: 🟢 GOOD**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | `ANVIL_URL` was `http://0.0.0.0:8545` (bind address used as URL) | 🟠 HIGH | ✅ FIXED — `http://localhost:8545` |
| 2 | pnpm installed globally in Docker production image | 🟡 MEDIUM | ✅ FIXED — dedicated `prod-deps` stage; runner copies node_modules, no pnpm |
| 3 | TradeProposed event miss was silent | 🟡 MEDIUM | ✅ FIXED — `app.log.warn(...)` with tx hash when event not found in receipt |
| 4 | Internal planning docs tracked in git | 🟠 HIGH | ✅ FIXED — `docs/superpowers/` in `.gitignore`, files removed from tracking |
| 5 | `.env` files in git | ✅ Confirmed clean | ✅ Still clean — `git ls-files \| grep .env` returns nothing |

### Remaining Issues

#### 🟡 [MEDIUM] No `.dockerignore`
Entire repo is copied to Docker build context. `node_modules/`, test files, and dev secrets are included unnecessarily.

#### 🟡 [MEDIUM] Docker containers run as root
No `USER` directive in either Dockerfile. Add a non-root `node` user in the runner stage.

#### 🟡 [MEDIUM] No database persistence in Docker Compose dev setup
KYC/AML data lives in-process memory unless `DATABASE_URL` is configured. Production blocks startup, but local Docker Compose falls back to in-memory without the Postgres service.

#### 🟡 [LOW] `node:20-alpine` base image not pinned to a digest
Floating tag means rebuilds may silently pull a different image. Pin to a SHA for reproducible production builds.

### Score Justification
+3 from three targeted fixes: ANVIL_URL corrected, production Docker image no longer carries pnpm overhead, and event-miss logging adds operational visibility. All previously reported critical items resolved. Four medium/low issues remain — none block deployment.

---

## 🧩 Product Completeness

**Readiness: ████████░░ 81/100 · prev: 84/100 · Δ: -3 · Status: 🟡 MEDIUM**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | Social button onclick guard (redundant `enabled &&`) | 🟡 MINOR | ✅ FIXED — `disabled={!enabled \|\| busy}` prop; accessible |
| 2 | Auth fetch re-ran on every route change | 🟡 MINOR | ✅ FIXED — once on mount; login/logout use `window.location.href` |
| 3 | NextAuth social login flow broken with custom middleware | NEW | 🔴 CRITICAL — social users authenticated by NextAuth but fail `archon_session` cookie check |

### Critical New Finding

#### 🔴 [CRITICAL] Social login does not set `archon_session` cookie
When a user signs in via Google or Facebook, NextAuth creates its own session token but never writes the `archon_session` httpOnly cookie that `middleware.ts` checks. Social-authenticated users hit protected routes and are immediately redirected back to `/login`. The credential login path is unaffected.

**Fix:** Add a NextAuth `signIn` or `jwt` callback in `[...nextauth].ts` that writes the `archon_session` cookie with the same HS256 JWT format as the credential path, OR update `middleware.ts` to also accept NextAuth's `next-auth.session-token` cookie as valid.

### Remaining Gaps
- Social login → protected route flow broken (must fix before enabling OAuth)
- No KYC/AML management UI for compliance officers
- No investor transaction history page
- No OTC cancel button in UI
- Social users hardcoded to `investor` role — no admin-role allowlist implemented

### Score Justification
−3 net: the two UX fixes are correct (+1 notional), but the NextAuth integration gap is a functional breakage for the social login feature (−4). The gap was structurally always present but not previously identified because OAuth credentials are not configured in any deployed environment.

---

## 📈 Go-to-Market

**Readiness: ███████░░░ 75/100 · prev: 72/100 · Δ: +3 · Status: 🟡 MEDIUM**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | Login page "This is a prototype" | 🟠 HIGH | ✅ FIXED — "Beta access. Credentials are pre-configured for demonstration." |
| 2 | Homepage, About, Platform, README copy | ✅ Clean | ✅ Clean — "Live on Ethereum Sepolia. Real contracts." throughout |
| 3 | `Layout.tsx` header: "OTC Fund Prototype" | NEW FINDING | 🔴 CRITICAL — rendered on every page |
| 4 | `Layout.tsx` footer: "thesis prototype demonstration" | NEW FINDING | 🔴 CRITICAL — contradicts all public messaging |
| 5 | No hosted demo URL | 🟡 PARTIAL | 🟡 PARTIAL — deployment configs ready, not yet deployed |
| 6 | No pricing model | 🟠 HIGH | 🟠 Unchanged |
| 7 | No security/compliance page | 🟠 HIGH | 🟠 Unchanged |

### Critical New Finding

#### 🔴 `Layout.tsx` still contains prototype language
`apps/web/components/Layout.tsx` renders on every page. It contains:
- Header: **"OTC Fund Prototype"**
- Footer: **"Built for thesis prototype demonstration. Transactions execute on a local EVM (chainId 31337)."**

This contradicts the Sepolia deployment messaging on every other page and will undermine any enterprise conversation immediately.

### Remaining GTM Gaps
1. Fix `Layout.tsx` header and footer copy (immediate — blocks all GTM progress)
2. Deploy hosted demo to a stable public URL
3. Define pricing model
4. Add `/security` page — SOC 2 roadmap, audit status, compliance frameworks
5. Link Etherscan contract addresses on homepage

### Score Justification
+3 from the login disclaimer fix. Partially offset by the Layout.tsx discovery — it was present before, but now identified as a higher-priority item. Net +3 because the fix is genuine progress; Layout.tsx was already reflected in the incomplete GTM polish score.

---

## Delta Summary

| Domain | May 28 | v1 | v2 | v3 | **v4** | Total Δ |
|--------|--------|----|----|----|--------|---------|
| ⚖️ Legal & Compliance | 22 | 68 | 68 | 72 | **74** | +52 |
| 🔐 Smart Contract Hardening | 52 | 76 | 76 | 74 | **74** | +22 |
| 🏗️ Infrastructure & DevOps | 28 | 52 | 78 | 85 | **88** | +60 |
| 🧩 Product Completeness | 34 | 78 | 78 | 84 | **81** | +47 |
| 📈 Go-to-Market | 28 | 62 | 62 | 72 | **75** | +47 |
| **Overall** | **33** | **67** | **72** | **77** | **78** | **+45** |

---

## Top Remaining Blockers

### Fix immediately (newly discovered this cycle):
1. 🔴 **`Layout.tsx` "OTC Fund Prototype" / "thesis prototype" copy** — visible on every page, contradicts all other messaging
2. 🔴 **NextAuth social login doesn't set `archon_session` cookie** — social users cannot access protected routes

### Before production deployment:
3. 🔴 **KYC + sanctions re-check at `/otc/settle`** — 7-day compliance window
4. 🟠 **Add `navCeiling` to OTCTrade** — asymmetric price risk
5. 🟠 **NAVRegistry `asOf` validation** — `require(asOf <= block.timestamp)`
6. 🟠 **Sanctions provider fail-closed** — fail-open on provider error

### Before enterprise sales conversations:
7. 🟠 **Deploy hosted public demo** — configs exist, deploy them
8. 🟠 **Define pricing model** — no commercial structure
9. 🟡 **Add `.dockerignore`** — reduces build context and secret exposure surface
10. 🟡 **Docker containers run as root** — add `USER node` to runner stages
11. 🟡 **OTCTrade not independently pausable** — add emergency stop
12. 🟡 **Link Etherscan on homepage** — validate "real settlement" claim

### Phased Remediation

| Phase | Focus | Target Score |
|-------|-------|--------------|
| **Phase 1** (this week) | Layout.tsx copy, NextAuth cookie fix, KYC at settle, NAV timestamp validation | 83/100 |
| **Phase 2** (2–3 weeks) | Deploy hosted demo, navCeiling, pricing page, security page, OTCTrade pausable | 89/100 |
| **Phase 3** (4–8 weeks) | KMS for private key, SOC 2 prep, KYC compliance UI, transaction history, .dockerignore, non-root containers | 94/100 |

---

*Report produced by the Archon Governance Agent System · 5 specialist agents · Model: claude-sonnet-4-6*
