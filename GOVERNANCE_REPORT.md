# Enterprise Governance Report
> Generated: 2026-06-09 UTC (v3)
> Project: Archon — Institutional OTC Settlement Platform  
> Previous Report: 2026-06-09 (v2)

---

## Overall Readiness

**Score: ████████░░ 77/100** *(prev: ███████░░░ 72/100 · +5 pts)*

| Domain | Status | Score | Δ from v2 | Δ from May 28 |
|--------|--------|-------|-----------|---------------|
| ⚖️ Legal & Compliance | 🟡 MEDIUM | ███████░░░ 72/100 | +4 | +50 |
| 🔐 Smart Contract Hardening | 🟡 MEDIUM | ███████░░░ 74/100 | -2 | +22 |
| 🏗️ Infrastructure & DevOps | 🟢 GOOD | ████████░░ 85/100 | +7 | +57 |
| 🧩 Product Completeness | 🟢 GOOD | ████████░░ 84/100 | +6 | +50 |
| 📈 Go-to-Market | 🟡 MEDIUM | ███████░░░ 72/100 | +10 | +44 |

> ✅ **Infrastructure & DevOps and Product Completeness now GOOD tier (80+).**  
> ⚠️ Smart Contract Hardening slid -2 on deeper NAV timestamp scrutiny — no code regression, new findings surfaced.  
> ⚠️ Legal & Compliance +4 from DATABASE_URL hard enforcement; KYC-at-settle gap persists.

---

## ⚖️ Legal & Compliance

**Readiness: ███████░░░ 72/100 · prev: 68/100 · Δ: +4 · Status: 🟡 MEDIUM**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | KYC gate at mint/subscribe | ✅ FIXED | ✅ Maintained |
| 2 | KYC gate at propose | ✅ FIXED | ✅ Maintained |
| 3 | KYC re-check at settle | 🟡 PARTIAL | 🔴 CRITICAL — confirmed absent |
| 4 | AML size + velocity limits | ✅ FIXED | ✅ Maintained |
| 5 | Sanctions screening | ✅ FIXED | ✅ Maintained |
| 6 | Audit trail (NAV, MINT, BURN) | ✅ FIXED | ✅ Maintained |
| 7 | requireApiKey unauthenticated when unset | 🟡 MEDIUM | 🟡 MEDIUM — deployment checklist only mitigation |
| 8 | DATABASE_URL optional in production | 🟡 PARTIAL (warning) | ✅ FIXED — process.exit(1) |
| 9 | Sanctions provider failure fail-open | NEW | 🟡 MEDIUM |
| 10 | OTC cancel events not audit-logged | NEW | 🟡 MEDIUM |

### Remaining Issues

#### 🔴 [CRITICAL] /otc/settle missing KYC + sanctions re-validation
Between proposal and settlement (up to 7 days), a buyer's KYC eligibility or sanctions status can change. Neither check is re-run at settlement time. A sanctioned address that was eligible at proposal can receive tokens.

#### 🟡 [MEDIUM] Sanctions provider failure is fail-open
External sanctions API errors return success — a network outage silently bypasses screening. Should be fail-closed in production.

#### 🟡 [MEDIUM] OTC trade cancellations not audit-logged
`/otc/cancel` has no audit trail entry. Cancelled trades are invisible in the compliance CSV export.

#### 🟡 [MEDIUM] requireApiKey bypasses auth when no key configured
Deployment checklist must mandate `API_KEY` — the API does not refuse to start without it (only `/otc/settle` should block production launch without a key, because the production fail-closed path depends on it).

### Score Justification
DATABASE_URL enforcement (+4) is the only structural change since v2. The KYC-at-settle gap is confirmed critical; AML, sanctions, and audit trail all remain solid. Compliance posture is strong at propose time but has a 7-day window vulnerability at settlement.

---

## 🔐 Smart Contract Hardening

**Readiness: ███████░░░ 74/100 · prev: 76/100 · Δ: -2 · Status: 🟡 MEDIUM**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | propose() permissionless | ✅ FIXED | ✅ Maintained |
| 2 | No seller consent mechanism | ✅ FIXED | ✅ Maintained — EIP-712 correct, nonces verified |
| 3 | No trade deadline | ✅ FIXED | ✅ MAX_TRADE_AGE (7 days) maintained |
| 4 | No NAV ceiling | 🟡 PARTIAL (floor only) | 🟠 HIGH — deeper audit confirms no ceiling implemented |
| 5 | Stale NAV risk | ✅ FIXED | ✅ MAX_NAV_AGE (24h) maintained |
| 6 | burnFrom() bypassed allowance | ✅ FIXED | ✅ Maintained |
| 7 | OTCTrade not independently pausable | 🟡 MEDIUM | 🟡 MEDIUM — unchanged |
| 8 | NAVRegistry accepts arbitrary asOf | 🟡 MEDIUM | 🔴 CRITICAL — no validation: asOf can be future-dated or zero |
| 9 | AccessRoles.sol unused stub | 🟡 LOW | 🟡 LOW — unchanged |
| 10 | OTCTrade zero test coverage | ✅ FIXED | ✅ 49 tests maintained; NAV timestamp edge cases missing |

### Remaining Issues

#### 🔴 [HIGH] NAVRegistry.postNAV() accepts arbitrary asOf timestamps
No validation that `asOf <= block.timestamp` or that values are monotonically increasing. A manager can post future-dated or backdated NAVs, corrupting the audit trail and potentially manipulating settlement prices.

#### 🟠 [HIGH] No navCeiling in OTCTrade
Only a floor is enforced at settlement. Seller is exposed to unlimited upside NAV movement post-signature — asymmetric price risk that institutional counterparties will reject.

#### 🟡 [MEDIUM] OTCTrade not independently pausable
Halting OTC settlement requires pausing the entire FundToken (blocking all mint/burn/transfer). No surgical emergency stop at the trade layer.

#### 🟡 [LOW] AccessRoles.sol is dead code
Defines role constants never imported by any deployed contract. Delete or document as deprecated.

### Score Justification
-2 reflects deeper scrutiny surfacing two HIGH gaps that were not resolved in prior sessions: NAVRegistry timestamp validation is entirely absent (asOf can be any value), and the navCeiling omission creates asymmetric price risk. No code regressed — this is a more rigorous reading of institutional requirements. EIP-712 seller consent and all access control remain correct.

---

## 🏗️ Infrastructure & DevOps

**Readiness: ████████░░ 85/100 · prev: 78/100 · Δ: +7 · Status: 🟢 GOOD**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | No Dockerfile | Reported as STILL PRESENT | ✅ CONFIRMED EXISTS — multi-stage API + Web Dockerfiles |
| 2 | docker-compose.yml | Reported as missing | ✅ CONFIRMED EXISTS — healthchecks, depends_on ordering |
| 3 | DATABASE_URL optional (warning only) | 🟡 PARTIAL | ✅ FIXED — process.exit(1) in production |
| 4 | DEPLOYMENT.md | Not present | ✅ FIXED — 155-line guide: Vercel+Railway, Railway-only, Render |
| 5 | No cloud deploy configs | Not present | ✅ FIXED — railway.toml, vercel.json, render.yaml all present |
| 6 | API bound to 127.0.0.1 | ✅ FIXED (prior) | ✅ Maintained — defaults to 0.0.0.0 |
| 7 | No CI/CD | ✅ FIXED (prior) | ✅ Maintained — 4-job GitHub Actions workflow |
| 8 | Private key logged to stdout | ✅ FIXED (prior) | ✅ Maintained — first 10 chars only |
| 9 | CORS hardcoded | ✅ FIXED (prior) | ✅ Maintained — CORS_ORIGIN env var |
| 10 | start.sh fail-fast | ✅ FIXED (prior) | ✅ Maintained — set -euo pipefail, 30s API readiness gate |
| 11 | .env in git | 🟠 HIGH | 🟠 HIGH — `.env` file with real Sepolia key confirmed tracked |

### Remaining Issues

#### 🟠 [HIGH] .env committed to git with live Sepolia private key
Root `.env` containing `PRIVATE_KEY` and `RPC_URL` is tracked in version control. Anyone with repo access can drain the Sepolia deployer wallet. Must run `git rm --cached .env` before any external sharing.

#### 🟡 [MEDIUM] No CI test coverage threshold
CI runs `pnpm test` but has no minimum coverage enforcement. A PR that removes tests silently passes.

#### 🟡 [MEDIUM] No staging environment in deployment configs
Vercel/Railway configs assume production-only. No preview branch or staging slot documented.

### Score Justification
+7 from: (a) DATABASE_URL now hard-exits in production, (b) Dockerfiles confirmed present with multi-stage builds, (c) DEPLOYMENT.md covering all three platforms with secret generation instructions. No critical gaps remain. The .env-in-git issue is the one outstanding HIGH item — important to fix before any external sharing but does not block local development.

---

## 🧩 Product Completeness

**Readiness: ████████░░ 84/100 · prev: 78/100 · Δ: +6 · Status: 🟢 GOOD**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | No auth / RBAC | ✅ FIXED | ✅ Maintained — JWT + Edge middleware + role guards |
| 2 | Login portal | ✅ FIXED | ✅ Maintained — credentials + social login scaffolding |
| 3 | Investor portal | ✅ FIXED | ✅ Complete — subscribe, redeem, balance, risk status |
| 4 | Manager portal | ✅ FIXED | ✅ Complete — post NAV, monitor fund |
| 5 | Auditor portal | ✅ FIXED | ✅ Complete — download CSV audit export |
| 6 | OTC settlement page | ✅ FIXED | ✅ Three interactive Sepolia scenarios |
| 7 | Market data page | ✅ FIXED | ✅ Live ETH/BTC, 60s auto-refresh |
| 8 | Public marketing pages | ✅ FIXED | ✅ Five pages — Home, About, Why On-Chain, Platform, Contact |
| 9 | Google/Facebook OAuth | NEW | ✅ Configured in NextAuth; gracefully inactive without env vars |
| 10 | Nav order corrected | NEW | ✅ Home → About → Why On-Chain → How It Works → Contact |
| 11 | KYC management UI | 🟡 PARTIAL | 🟡 API-only — no compliance officer UI |
| 12 | Transaction history page | ⚠️ NOT PRESENT | ⚠️ NOT PRESENT |
| 13 | OTC cancel button in UI | 🟡 PARTIAL | 🟡 Backend exists, no UI trigger |

### Remaining Gaps

- No KYC/AML management UI for compliance officers (admin panel)
- No investor transaction history or portfolio history page
- No user profile / settings page
- No API documentation (Swagger/OpenAPI)
- OTC cancel has no UI button — only accessible via API
- Social login assigns investor role only — no admin-role assignment flow

### Score Justification
+6 from social login scaffolding (now properly configured with graceful fallback), corrected nav order, and deeper audit confirming all five portals are complete. Score of 84 reflects a polished, fully functional demo with a small set of enhancement-level gaps (KYC UI, portfolio history) rather than functional holes.

---

## 📈 Go-to-Market

**Readiness: ███████░░░ 72/100 · prev: 62/100 · Δ: +10 · Status: 🟡 MEDIUM**

### Findings

| # | Finding | Previous | Now |
|---|---------|----------|-----|
| 1 | README engineer-facing | 🟡 PARTIAL | ✅ FIXED — product-first tagline, buyer-facing framing |
| 2 | No hosted demo | 🔴 CRITICAL | 🟡 PARTIAL — deployment configs ready, not yet deployed |
| 3 | Hardcoded localhost API URL | ✅ FIXED | ✅ Maintained |
| 4 | No brand identity | ✅ FIXED | ✅ Maintained — "Archon" consistent everywhere |
| 5 | UI labeled as simulation | ✅ FIXED | ✅ Maintained — professional, live-first copy |
| 6 | No lead-gen form | ✅ FIXED | ✅ Complete — contact form captures institution, role, AUM, use case |
| 7 | No competitive positioning | ✅ FIXED | ✅ Why On-Chain page with 6-dimension comparison vs Coinbase Prime |
| 8 | No pricing model | 🟠 HIGH | 🟠 HIGH — unchanged |
| 9 | No deployment guide | 🔴 CRITICAL | ✅ FIXED — DEPLOYMENT.md with Vercel+Railway, Railway-only, Render |
| 10 | No enterprise security page | 🟠 HIGH | 🟠 HIGH — unchanged |

### GTM Assets Summary
- Professional 5-page marketing site with live Sepolia data
- Lead-gen contact form (institution, role, AUM bracket, use case)
- Competitive positioning page vs Traditional OTC and Coinbase Prime
- Complete deployment guide (3 platforms) with secrets checklist
- Brand identity consistent across all pages and docs

### Remaining GTM Gaps

1. **No live demo URL** — configs exist but not deployed; prospects can't self-serve
2. **No pricing model** — no licensing tiers, SaaS vs self-hosted not defined
3. **No security/compliance page** — SOC 2 roadmap, audit status, regulatory positioning all absent
4. **No pitch deck or one-pager** — sales collateral for enterprise conversations not created
5. **Etherscan links missing** — homepage claims "real settlement" but doesn't link to deployed contracts

### Score Justification
+10 from: README rewrite (product-first, no "prototype" language), DEPLOYMENT.md guide eliminating the local-setup-only barrier, and deployment configs validated. Plateau at 72 because no live URL exists (still the primary blocker for self-serve inbound), pricing undefined, and no enterprise security posture page.

---

## Delta Summary

| Domain | May 28 | Jun 09 v1 | Jun 09 v2 | Jun 09 v3 | Total Δ |
|--------|--------|-----------|-----------|-----------|---------|
| ⚖️ Legal & Compliance | 22 | 68 | 68 | **72** | +50 |
| 🔐 Smart Contract Hardening | 52 | 76 | 76 | **74** | +22 |
| 🏗️ Infrastructure & DevOps | 28 | 52 | 78 | **85** | +57 |
| 🧩 Product Completeness | 34 | 78 | 78 | **84** | +50 |
| 📈 Go-to-Market | 28 | 62 | 62 | **72** | +44 |
| **Overall** | **33** | **67** | **72** | **77** | **+44** |

---

## Top Remaining Blockers

### Before any external sharing of the repo:
1. 🔴 **Remove .env from git** — `git rm --cached .env && git commit` — live Sepolia key is tracked

### Before a production deployment:
2. 🔴 **Add KYC + sanctions re-check to /otc/settle** — 7-day window compliance gap
3. 🟠 **Add navCeiling to OTCTrade** — asymmetric price risk blocks institutional use
4. 🟠 **Add asOf validation to NAVRegistry** — `require(asOf <= block.timestamp)` + monotonicity
5. 🟠 **requireApiKey must be set** — deployment checklist must enforce this

### Before enterprise sales conversations:
6. 🟠 **Deploy hosted public demo** — deploy.archon.com using the configs that now exist
7. 🟠 **Define pricing model** — managed SaaS vs self-hosted licensing
8. 🟡 **Add /security page** — SOC 2 roadmap, audit status, compliance frameworks
9. 🟡 **Add OTCTrade Pausable** — independent emergency stop
10. 🟡 **Link Etherscan on homepage** — validate "live settlement" claim visibly

### Phased Remediation

| Phase | Focus | Target Score |
|-------|-------|--------------|
| **Phase 1** (this week) | Remove .env from git, KYC at settle, NAVRegistry timestamp validation, navCeiling | 82/100 |
| **Phase 2** (2–3 weeks) | Deploy hosted demo, pricing page, security page, OTCTrade pausable | 88/100 |
| **Phase 3** (4–8 weeks) | KMS for private key, SOC 2 prep, KYC compliance UI, transaction history, pitch deck | 93/100 |

---

*Report produced by the Archon Governance Agent System · 5 specialist agents · Model: claude-sonnet-4-6*
