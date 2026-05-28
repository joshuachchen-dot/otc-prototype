# Enterprise Governance Report
> Generated: 2026-05-28 UTC  
> Project: OTC Fund Prototype — `/Users/joshuachen/Desktop/Aiotek/otc-prototype_final`

---

## Overall Readiness

**Score: ██░░░░░░░░ 33/100**

| Domain | Status | Score |
|--------|--------|-------|
| ⚖️ Legal & Compliance | ❌ CRITICAL | ██░░░░░░░░ 22/100 |
| 🔐 Smart Contract Hardening | ❌ CRITICAL | █████░░░░░ 52/100 |
| 🏗️ Infrastructure & DevOps | ❌ CRITICAL | ██░░░░░░░░ 28/100 |
| 🧩 Product Completeness | ❌ CRITICAL | ███░░░░░░░ 34/100 |
| 📈 Go-to-Market | ❌ CRITICAL | ██░░░░░░░░ 28/100 |

> ⚠️ **All 5 domains are in CRITICAL status. This system requires significant hardening before enterprise deployment.**

---

## ⚖️ Legal & Compliance

**Readiness: ██░░░░░░░░ 22/100  |  Status: ❌ CRITICAL**

### Findings

#### 🔴 [CRITICAL] mint() has no KYC gate — off-chain check is entirely absent

`POST /token/subscribe` calls `token.write.mint()` directly after validating only address format and amount. There is no lookup against the investors table, no check of the `eligible` flag, and no call to any KYC helper before dispatching the on-chain mint. Any caller who can reach the API endpoint can mint tokens to any address regardless of KYC status.

*File: `apps/api/src/routes/token.ts`*

#### 🔴 [CRITICAL] On-chain mint() also has no KYC/whitelist guard

`FundToken.mint()` enforces only `SUBSCRIPTION_ROLE`. The whitelist mapping exists and is checked in `_update()` for p2p transfers, but it is NOT checked during mint (from == address(0) path skips the require). A whitelisted-receiver check is not equivalent to a KYC-eligible check. There is no on-chain reference to the investors table or any credential hash.

*File: `contracts/src/FundToken.sol`*

#### 🔴 [CRITICAL] POST /kyc/mark-eligible has no authentication or authorization

The route registers an investor as KYC-eligible with a single unauthenticated POST. There is no API key check, no JWT/session middleware, no role assertion, and no Fastify preHandler hook. Any anonymous HTTP client can mark any Ethereum address as eligible.

*File: `apps/api/src/routes/kyc.ts`*

#### 🔴 [CRITICAL] POST /nav/post has no authentication or authorization

NAV publication — a material fact that affects settlement conditions — is exposed via an unauthenticated API endpoint. Any caller can post an arbitrary NAV value, which is then accepted on-chain because the API signs with the admin private key.

*File: `apps/api/src/routes/nav.ts`*

#### 🔴 [CRITICAL] POST /risk/set/:s has no authentication or authorization

The risk status endpoint (green/yellow/red) that would gate trading decisions can be set by any unauthenticated caller. Risk state is stored only in a module-level in-memory variable with no persistence, audit trail, or access control.

*File: `apps/api/src/routes/risk.ts`*

#### 🔴 [CRITICAL] Unrestricted propose() — any address can register a trade against any seller/buyer

`OTCTrade.propose()` has no access control: any EOA or contract can call it and register a trade naming arbitrary seller and buyer addresses. Combined with the unauthenticated `/otc/propose` API route, this means trades can be fabricated by third parties without counterparty consent.

*File: `contracts/src/OTCTrade.sol`*

#### 🔴 [CRITICAL] Unrestricted settle() — any address can trigger token transfer

`OTCTrade.settle()` has no caller restriction. Any third party can call `settle()` on a pending trade ID and force a burn-from-seller / mint-to-buyer without the counterparties initiating or approving the settlement.

*File: `contracts/src/OTCTrade.sol`*

#### 🟠 [HIGH] PRIVATE_KEY loaded from .env with no secrets manager

The signing key is read from a local `.env` file via dotenv, validated as a full 64-hex private key, partially logged to stdout on startup (first 10 chars), and passed directly to viem wallet client. There is no HSM, KMS (AWS/GCP), or vault integration.

*File: `apps/api/src/env.ts`*

#### 🟠 [HIGH] MINT and BURN audit rows have ts=0 — wall-clock timestamps missing

In `/audit/export`, every MINT and BURN row is hard-coded to `ts: '0'`. The code does not call `rpc.getBlock()` to resolve block timestamps. Any regulatory audit CSV export will show epoch-zero timestamps for all token issuances and redemptions.

*File: `apps/api/src/routes/audit.ts`*

#### 🟠 [HIGH] /audit/export is unauthenticated — full investor activity is publicly readable

`GET /audit/export` requires no credentials and returns a full CSV of all on-chain mint, burn, and NAV events including investor addresses and amounts. This violates data-minimisation obligations under GDPR/MAS PDPA.

*File: `apps/api/src/routes/audit.ts`*

#### 🟠 [HIGH] OTC buyer KYC not checked at propose or settle time

Neither `/otc/propose` nor `OTCTrade.settle()` verifies that the buyer (token recipient) is KYC-eligible. Tokens can be minted to a non-eligible buyer via the OTC settlement path even if the subscribe route were later hardened.

*File: `apps/api/src/routes/otc.ts`*

#### 🟠 [HIGH] No AML transaction monitoring or suspicious-activity reporting

There is no threshold-based transaction monitoring, velocity check, sanctions-list screening (OFAC/UN), or SAR filing mechanism anywhere in the API or contracts. This is mandatory under MiCA Title VI, MAS Notice SFA04-N02, and Reg D rule 506(b).

*File: `apps/api/src/routes/token.ts`*

#### 🟡 [MEDIUM] vcHash is optional and not validated

The `vcHash` field in `/kyc/mark-eligible` is `z.string().optional()`. An operator can mark addresses eligible with a null or fabricated hash, providing no actual verifiable credential trail for regulatory inspection.

*File: `apps/api/src/routes/kyc.ts`*

#### 🟡 [MEDIUM] No investor accreditation or offering-size limits for Reg D compliance

The platform has no mechanism to verify accredited investor status, no aggregate offering-size cap, no state Blue Sky exemption tracking, and no Form D filing workflow. These are prerequisites for any US private placement under Rule 506.

#### 🟡 [MEDIUM] No rate limiting, replay protection, or idempotency on state-mutating routes

All POST endpoints have no rate limiting, nonce, or idempotency key. Duplicate submissions will create duplicate on-chain transactions.

#### 🟢 [LOW] Risk status is ephemeral in-process memory — lost on restart

The risk module stores status as a module-level JS variable. Any API restart resets it to `'green'` regardless of actual risk posture.

*File: `apps/api/src/routes/risk.ts`*

### Recommendations

- Add a KYC pre-check in `POST /token/subscribe`: query the investors table and reject with 403 if `eligible` is not true before calling `token.write.mint()`. Apply the same check in `/otc/propose` for both seller and buyer addresses.
- Enforce KYC on-chain: extend `FundToken.mint()` to accept only addresses present in an on-chain whitelist, or use a Merkle-proof pattern so the contract verifies inclusion at mint time.
- Add authentication middleware to all state-mutating and sensitive-read routes. At minimum, implement a shared-secret API key (`X-API-Key` header) validated in a Fastify `preHandler`. For production, use mutual TLS or JWT with role claims for MANAGER, OPERATOR, and AUDITOR roles.
- Migrate the `PRIVATE_KEY` to a cloud KMS or HSM (AWS KMS, GCP Cloud HSM, HashiCorp Vault). Remove the raw key from `.env` and eliminate the partial-key `console.log` in `env.ts`.
- Resolve MINT/BURN timestamps in `/audit/export` by calling `rpc.getBlock(log.blockNumber)` for each Transfer log. Required for a legally admissible audit trail.
- Add a NAV staleness guard in `OTCTrade.settle()`: `require(block.timestamp - nav.asOf <= MAX_NAV_AGE, 'STALE_NAV')`.
- Restrict `OTCTrade.propose()` to addresses holding a `SETTLEMENT_AGENT_ROLE`, and restrict `settle()` to the designated buyer or a licensed settlement agent.
- Implement AML transaction monitoring: add a maximum single-transaction size, a 24-hour rolling volume limit per address, and integrate an OFAC/UN sanctions-list screening API before any mint or OTC settlement.
- For MiCA compliance: implement a whitepaper disclosure link in token metadata, a redemption-at-par mechanism, reserve asset attestation, and a 30-day investor withdrawal right.
- For Reg D compliance: add accredited investor attestation fields to the KYC schema, enforce a 504/506 offering-size cap at the API layer, and generate Form D filing reminders.

---

## 🔐 Smart Contract Hardening

**Readiness: █████░░░░░ 52/100  |  Status: ❌ CRITICAL**

### Findings

#### 🔴 [CRITICAL] OTCTrade.propose() is permissionless — anyone can register a trade against any seller/buyer

`propose()` has no `onlyRole` guard. Any EOA can create a trade naming arbitrary seller and buyer addresses. If `OTCTrade` already holds `REDEMPTION_ROLE` and `SUBSCRIPTION_ROLE` on `FundToken` (required for `settle()` to work), a malicious caller can propose a trade with `seller=victim`, `buyer=attacker`, then immediately call `settle()`. Tokens are burned from the victim and minted to the attacker with no victim consent.

*File: `contracts/src/OTCTrade.sol`*

#### 🔴 [CRITICAL] No seller consent or approval mechanism before settlement

`settle()` burns tokens from `t.seller` via `burnFrom()` without ever requiring the seller to sign, approve, or acknowledge the trade. `FundToken.burnFrom()` calls `_burn()` directly and does not check ERC-20 allowances — it is gated only by `REDEMPTION_ROLE`, which `OTCTrade` holds permanently. This means any pending trade can drain a seller's balance the moment anyone calls `settle()`.

*File: `contracts/src/OTCTrade.sol`*

#### 🟠 [HIGH] No deadline on trades — pending trades never expire

The `Trade` struct contains no expiry timestamp and there is no deadline parameter in `propose()` or `settle()`. A trade proposed when NAV was high can be settled years later under entirely different market conditions.

*File: `contracts/src/OTCTrade.sol`*

#### 🟠 [HIGH] No slippage ceiling on OTC price — navFloor is one-sided with no cap

The `navFloor` check only ensures `NAV >= floor`. There is no `navCeiling` or `maxPrice` guard. In a rapidly appreciating NAV environment the buyer receives tokens at a price far below current market value, imposing an uncapped loss on the seller with no protection.

*File: `contracts/src/OTCTrade.sol`*

#### 🟠 [HIGH] Stale NAV risk — no freshness check on latestNAV()

`settle()` calls `navRegistry.latestNAV()` and checks only `nav.nav >= t.navFloor`. There is no check on `nav.asOf` or `nav.storedAt` relative to `block.timestamp`. If the manager stops posting NAV updates, settlements continue against a stale price indefinitely.

*File: `contracts/src/OTCTrade.sol`*

#### 🟠 [HIGH] FundToken.burnFrom() bypasses ERC-20 allowance — silently diverges from standard

`burnFrom()` calls `_burn()` directly without checking or decrementing the caller's ERC-20 allowance from the token holder. Standard ERC-20 `burnFrom` semantics require `msg.sender` to have a sufficient allowance granted by `from`. This means the `REDEMPTION_ROLE` holder can burn any holder's tokens with zero consent.

*File: `contracts/src/FundToken.sol`*

#### 🟡 [MEDIUM] OTCTrade is not pausable independently

`FundToken` is `Pausable`, but `OTCTrade` itself has no pause mechanism. While pausing `FundToken` will cause `settle()` to revert, the pause must be triggered before the attacker's transaction lands. There is no way to pause the trade lifecycle independently.

*File: `contracts/src/OTCTrade.sol`*

#### 🟡 [MEDIUM] NAVRegistry accepts asOf values in the past or future with no validation

`postNAV(nav, asOf)` does not validate that `asOf <= block.timestamp` or that `asOf > previous record's asOf`. A manager can post a record with `asOf` far in the future or backdate values, making the history array unreliable.

*File: `contracts/src/NAVRegistry.sol`*

#### 🟡 [MEDIUM] AccessRoles.sol is an unused stub — role constants duplicated across contracts

`AccessRoles` defines `MANAGER_ROLE`, `SUBSCRIPTION_ROLE`, `REDEMPTION_ROLE`, and `PAUSER_ROLE` but is never imported or inherited by any contract. Each contract independently re-derives its own role constants, creating a maintenance and divergence risk.

*File: `contracts/src/AccessRoles.sol`*

#### 🟡 [MEDIUM] OTCTrade has zero test coverage

No test file exists for `OTCTrade.sol`. The most security-critical contract in the system — the one that can burn and mint tokens — has no tests at all. Attack scenarios for the permissionless `propose` vulnerability, stale NAV settlement, and double-settle are entirely untested.

#### 🟢 [LOW] FundToken test expects wrong revert string

`testMint_RevertsForNonWhitelistedRecipient()` uses `vm.expectRevert("INVESTOR_NOT_ELIGIBLE")` but the contract reverts with `"RECEIVER_NOT_WHITELISTED"` (`FundToken.sol` line 39). This test will fail on the next `forge test` run.

*File: `contracts/test/FundToken.t.sol`*

#### 🟢 [LOW] No event emitted on whitelist state changes

`setWhitelisted()` modifies the whitelist mapping but emits no event. Off-chain monitoring systems cannot detect when addresses are added or removed without polling storage.

*File: `contracts/src/FundToken.sol`*

### Recommendations

- Add role-based access control to `OTCTrade.propose()` (e.g., `SETTLEMENT_AGENT_ROLE`) so only authorised counterparties can register trades.
- Implement explicit seller consent: require the seller to call an `approve()` or `confirmTrade()` function before `settle()` can execute, or require a seller-signed EIP-712 message verified in `settle()`.
- Add a `deadline` field to the `Trade` struct and revert in `settle()` if `block.timestamp > trade.deadline`.
- Add a `navCeiling` field to `Trade` alongside `navFloor` to bound the acceptable price range on both sides.
- Add a NAV freshness check in `OTCTrade.settle()`: `require(block.timestamp - nav.storedAt <= MAX_NAV_AGE)` with a configurable constant (e.g., 24 hours).
- Add monotonicity validation to `NAVRegistry.postNAV()`: `require(asOf <= block.timestamp && asOf > history[last].asOf)`.
- Inherit `Pausable` in `OTCTrade` and expose a `pause`/`unpause` function gated by `PAUSER_ROLE`.
- Fix `FundToken.burnFrom()` to check and decrement the ERC-20 allowance granted by the token holder.
- Refactor all contracts to import role constants from `AccessRoles.sol` as a single source of truth.
- Write a comprehensive `OTCTrade` test suite covering: happy-path settlement, permissionless propose attack, stale NAV settlement, double-settle attempt, cancel-then-settle attempt, and settle-while-paused.
- Fix the test string mismatch in `FundToken.t.sol` line 53: `'INVESTOR_NOT_ELIGIBLE'` → `'RECEIVER_NOT_WHITELISTED'`.

---

## 🏗️ Infrastructure & DevOps

**Readiness: ██░░░░░░░░ 28/100  |  Status: ❌ CRITICAL**

### Findings

#### 🔴 [CRITICAL] Hardcoded private key in start.sh

The well-known Anvil default private key (`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`) is hardcoded in `start.sh` and written verbatim into `apps/api/.env` at runtime. If this pattern is carried into any staging/production environment, the deployer key is fully exposed in version control and on disk.

*File: `start.sh (line 12)`*

#### 🔴 [CRITICAL] API bound to 127.0.0.1 — unreachable in any container or cloud deployment

`apps/api/src/index.ts` calls `app.listen({ port: ENV.PORT, host: '127.0.0.1' })`. In Docker, Kubernetes, Cloud Run, or any VM-based deployment the server is unreachable to any load balancer or ingress. The server must bind to `0.0.0.0` for production.

*File: `apps/api/src/index.ts (line 39)`*

#### 🔴 [CRITICAL] No CI/CD pipeline — zero automated validation on push

There is no `.github` directory and therefore no GitHub Actions workflows. No build, lint, type-check, or test step runs on any push or pull request. Broken code can be merged to main silently.

*File: `(absent — .github/workflows/)`*

#### 🔴 [CRITICAL] No Dockerfile — deployments are not reproducible

No `Dockerfile`, `docker-compose.yml`, or any cloud-specific build spec exists anywhere in the repository. Deploying to any environment requires manual, undocumented steps.

#### 🟠 [HIGH] DATABASE_URL is optional — silently missing in production

In `apps/api/src/env.ts`, `DATABASE_URL` is declared `z.string().optional()`. If absent at runtime, the app starts without error but every DB-dependent route throws at query time rather than failing fast at startup. No connection-pooling configuration exists.

*File: `apps/api/src/env.ts (line 21)`*

#### 🟠 [HIGH] CORS locked to http://localhost:3000 — hardcoded, not environment-driven

`apps/api/src/index.ts` registers CORS with `origin: 'http://localhost:3000'`. In any non-local environment all cross-origin requests will be blocked by the browser.

*File: `apps/api/src/index.ts (line 21)`*

#### 🟠 [HIGH] Private key partial value leaked to stdout at every startup

`env.ts` logs `ENV.PRIVATE_KEY.slice(0, 10) + '...'` on every start. The first 10 characters narrow the key space significantly and appear in any log aggregation system (CloudWatch, Stackdriver, Datadog) where they may be retained and indexed.

*File: `apps/api/src/env.ts (lines 42-49)`*

#### 🟡 [MEDIUM] No database connection pooling configuration

The `pg` package is a dependency but there is no `pg.Pool` configuration (no max size, connection timeout, or idle timeout). Under load each request may open a new connection, exhausting PostgreSQL's connection limit.

#### 🟡 [MEDIUM] Raw console.log in production module (env.ts)

`env.ts` uses `console.log` rather than the Fastify structured logger, bypassing log level filtering, log rotation, and any structured-logging pipeline.

*File: `apps/api/src/env.ts (line 42)`*

#### 🟡 [MEDIUM] start.sh address parsing is brittle — silent empty-string failure

Contract addresses are extracted with `grep + awk` pattern matching on forge's stdout. If forge output format changes or deploy fails partially, addresses will be empty strings. No assertion checks that addresses are non-empty before writing `.env`.

*File: `start.sh (lines 53-55)`*

#### 🟢 [LOW] No .nvmrc or engines field — Node.js version is unspecified

The root `package.json` pins pnpm via `packageManager` but there is no Node.js version constraint (`.nvmrc`, `.node-version`, or `engines` field).

### Recommendations

- Bind the API to `0.0.0.0` and drive the host via a `HOST` environment variable: `host: process.env.HOST ?? '0.0.0.0'`.
- Remove the hardcoded private key from `start.sh` entirely; document that developers must supply their own key via a `.env.local` file that is gitignored.
- Remove the `console.log` in `env.ts` that prints any portion of `PRIVATE_KEY`.
- Make `DATABASE_URL` required (remove `.optional()`) and add an explicit `pg.Pool` with configurable max connections; fail fast at startup if the URL is absent.
- Add a `Dockerfile` for the API (multi-stage: build → slim runtime image) and a `docker-compose.yml` for local development with a real Postgres container.
- Create `.github/workflows/ci.yml` that runs on push/PR: install deps, `tsc --noEmit`, `jest`, and `forge test`.
- Move the CORS allowed origin to an env var (`CORS_ORIGIN`) defaulting to `http://localhost:3000` in development only.
- Add a guard in `start.sh` after address parsing: `[ -z "$FUND_TOKEN_ADDRESS" ] && { echo 'Deploy failed: FundToken address empty'; exit 1; }`.
- Add an `engines` field to `package.json` specifying the supported Node.js version range and add a `.nvmrc` file.
- Configure jest with a coverage threshold and enforce it in CI.

---

## 🧩 Product Completeness

**Readiness: ███░░░░░░░ 34/100  |  Status: ❌ CRITICAL**

### Findings

#### 🔴 [CRITICAL] No authentication or authorization on any API route

Every API route — including `POST /kyc/mark-eligible`, `POST /nav/post`, `POST /token/subscribe`, `POST /token/redeem`, `POST /otc/propose`, `POST /otc/settle`, `POST /otc/cancel`, and `POST /risk/set/:s` — accepts unauthenticated requests. Any anonymous caller with network access can mint tokens, post NAV, mark wallets KYC-eligible, or settle OTC trades.

*File: `apps/api/src/routes/kyc.ts, nav.ts, token.ts, otc.ts, risk.ts`*

#### 🔴 [CRITICAL] No role-based access control — manager and auditor portals are public

The manager page renders the NAV form unconditionally to whoever navigates to `/manager`. The auditor page renders the CSV download unconditionally. The API routes `POST /nav/post` and `GET /audit/export` carry no server-side role enforcement.

*File: `apps/web/src/pages/manager.tsx, apps/web/src/pages/auditor.tsx`*

#### 🟠 [HIGH] Balance displayed in raw wei — no human-readable conversion

`investor.tsx` renders balance with the label `'Balance (wei)'` and shows the raw wei string (e.g. `'1000000000000000000'`). The amount input defaults to `'1000000000000000000'`. By contrast, `otc.tsx` correctly divides by `10n**18n`, demonstrating the pattern is known but not applied consistently.

*File: `apps/web/src/pages/investor.tsx`*

#### 🟠 [HIGH] NAV values displayed as raw integers with no scaling or currency formatting

`manager.tsx` displays the raw `nav`, `asOf`, and `storedAt` integer strings with no transformation. NAV is stored scaled by 1e6 (e.g. `3000000000 = $3,000`), Unix timestamps displayed as raw epoch integers.

*File: `apps/web/src/pages/manager.tsx`*

#### 🟠 [HIGH] KYC management has no UI page

There is no `/kyc` page. The KYC routes (`POST /kyc/mark-eligible`, `GET /kyc/:address`) have no corresponding UI surface. Operators must call the API directly to manage investor eligibility.

#### 🟠 [HIGH] Risk management has no UI page

There is no `/risk` page. The risk status write endpoint (`POST /risk/set/:s`) has no UI counterpart.

#### 🟠 [HIGH] OTC cancel action has no UI

`POST /otc/cancel` exists in the API but is unreachable from the interface. There is no cancel button anywhere.

*File: `apps/web/src/pages/otc.tsx, apps/api/src/routes/otc.ts`*

#### 🟡 [MEDIUM] OTC page uses hardcoded Anvil test addresses — no real counterparty input

`otc.tsx` hardcodes `SELLER` and `BUYER` as Anvil pre-funded accounts #1 and #2. There is no input field allowing a user to specify actual counterparty addresses, making the OTC page purely a demo harness.

*File: `apps/web/src/pages/otc.tsx`*

#### 🟡 [MEDIUM] OTC and Market pages not linked from home page

`index.tsx` links to `/investor`, `/manager`, and `/auditor` but does not include links to `/otc` or `/market`.

#### 🟡 [MEDIUM] Manager page has no loading state and no error handling on initial fetch

`manager.tsx` `load()` function has no `catch` block. If the API returns an error, it is silently discarded and the user sees `'No NAV posted yet.'` with no error message — indistinguishable from the genuine empty state.

*File: `apps/web/src/pages/manager.tsx`*

#### 🟡 [MEDIUM] Auditor page has no loading state, error handling, or download feedback

`auditor.tsx` sets `window.location.href` directly with no indication of progress and no error displayed if the export fails.

*File: `apps/web/src/pages/auditor.tsx`*

#### 🟡 [MEDIUM] Audit CSV timestamps for MINT/BURN are hardcoded to 0

`audit.ts` exports every MINT and BURN row with `ts: '0'` (line 46). An auditor receiving this CSV must manually source block timestamps from an explorer.

*File: `apps/api/src/routes/audit.ts`*

#### 🟡 [MEDIUM] Manager NAV does not auto-refresh when the market scheduler posts

`manager.tsx` calls `load()` only once on mount and after a successful manual NAV post. If NAV is updated by the automated market scheduler (which runs every 60 seconds), the Manager Console will show stale data.

*File: `apps/web/src/pages/manager.tsx`*

### Recommendations

- Implement server-side authentication middleware on ALL mutating routes before any production use.
- Add role-based guards: restrict `POST /nav/post` to a 'manager' role, `GET /audit/export` to an 'auditor' role, and `POST /kyc/mark-eligible` to a 'compliance' role. Redirect unauthorized users rather than silently rendering the form.
- Convert all wei amounts to human-readable token units (divide by 1e18) before displaying. Apply the pattern already used in `otc.tsx` to `investor.tsx` balance and amount fields.
- Convert NAV integers (scaled ×1e6) to dollar amounts with `toLocaleString()`, and convert Unix timestamps to human-readable date strings in the Manager Console.
- Create a `/kyc` page for compliance officers and a `/risk` page for operators. Link both from the home page.
- Add a Cancel button on the OTC page that accepts a trade ID and calls `POST /otc/cancel`.
- Link `/otc` and `/market` from the home page so all portal pages are discoverable.
- Add error handling to `manager.tsx load()` with a catch block, and a loading spinner during the initial NAV fetch.
- Replace `window.location.href` in `auditor.tsx` with a fetch-based download using a Blob URL so export errors can be displayed.
- Fix audit CSV MINT/BURN rows: fetch block timestamps and convert wei amounts to token units in the exported CSV.
- Add a polling interval (e.g. every 30 seconds) to `manager.tsx` to reflect automated NAV updates.

---

## 📈 Go-to-Market

**Readiness: ██░░░░░░░░ 28/100  |  Status: ❌ CRITICAL**

### Findings

#### 🔴 [CRITICAL] README targets engineers, not buyers

The README is a pure developer setup guide: four-terminal launch sequence, forge/anvil prerequisites, BigInt troubleshooting. It contains no executive summary, no value proposition, no problem statement, and no description of who would purchase this system or why.

*File: `README`*

#### 🔴 [CRITICAL] No demo environment — local blockchain required for every demo

`start.sh` launches Anvil (local EVM), deploys contracts, and writes a `.env` pointing to `http://127.0.0.1:8545`. A prospect must install Foundry, Node, pnpm, and run four processes just to see the UI. There is no hosted testnet deployment, no mock mode, and no read-only preview.

*File: `start.sh`*

#### 🔴 [CRITICAL] Hardcoded localhost API URL in the shipped frontend

`apps/web/lib/api.ts` exports the base URL as a hardcoded `http://localhost:3001`. The UI cannot function against any non-local API without a code change and rebuild — it is architecturally incompatible with a cloud demo or SaaS deployment.

*File: `apps/web/lib/api.ts`*

#### 🔴 [CRITICAL] Product name is 'OTC Fund Prototype' — no commercial brand identity

`package.json` names the root package `'ots-proto'`. The home page `<h1>` reads `'OTC Fund Prototype'`. There is no logo, no favicon, no branded color palette, no product name. The `public/` directory does not exist. Zero brand differentiation from a generic open-source scaffold.

*File: `apps/web/src/pages/index.tsx`*

#### 🔴 [CRITICAL] UI explicitly labels itself as a simulation

The home page subtitle reads: `'Choose a portal to simulate the fund workflow (local Anvil + API + UI).'` The investor page says `'Simulate subscription (mint) and redemption (burn) against the local contracts.'` These disclosures destroy the illusion of a production-grade system during any sales demo.

*File: `apps/web/src/pages/index.tsx`*

#### 🟠 [HIGH] KYC is non-functional in every standard demo run

The KYC routes return HTTP 503 with `'Database not configured (DATABASE_URL missing)'` whenever `DATABASE_URL` is absent — which is always the case because `start.sh` never writes it. KYC — a core regulated feature — does not work in any standard demo.

*File: `apps/api/src/routes/kyc.ts`*

#### 🟠 [HIGH] Onboarding requires 5 external tool installs and 4 concurrent processes

Prerequisites: Node.js ≥18, pnpm, Foundry (forge + anvil), curl. Any step failure causes a cryptic exit. There is no Docker Compose, no cloud deploy script, no one-click option.

*File: `start.sh`*

#### 🟠 [HIGH] Hardcoded test private key committed to repo

`PRIVATE_KEY=0xac0974bec...` is written verbatim in `start.sh`. While this is a test-only key, any security-conscious enterprise buyer reviewing the repo will flag this as poor security hygiene.

*File: `start.sh`*

#### 🟠 [HIGH] No pricing, licensing, or commercialization structure

No `LICENSE` file, no `PRICING` document, no SaaS tier structure, no usage terms. A buyer cannot determine how to procure, price, or legally use this system.

*File: `package.json`*

#### 🟡 [MEDIUM] Raw wei and scaled-integer inputs unintelligible to business users

The investor portal amount field defaults to `'1000000000000000000'`. The manager NAV field defaults to `'123456789'`. These raw chain representations are unintelligible to fund managers or compliance officers.

#### 🟡 [MEDIUM] Risk status is decorative — in-memory, no engine, resets on restart

The risk status feature resets to `'green'` on every API restart with no persistence, no thresholds, and no event-based triggers. It is cosmetic in its current form.

#### 🟡 [MEDIUM] No sales assets, pitch materials, or technical one-pager

No `.pdf`, `.pptx`, or `.key` files exist. There is no architecture diagram for a non-technical audience, no competitive landscape comparison, and no ROI framing.

#### 🟢 [LOW] Duplicate pages directories — `/pages` and `/src/pages` both exist

The web app contains both `apps/web/pages/` and `apps/web/src/pages/`. Next.js will use only one; the other is dead code.

### Recommendations

- Replace the hardcoded localhost API URL with an environment variable: change `lib/api.ts` to use `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'` and deploy a persistent testnet instance (Sepolia or Base Sepolia) so prospects can reach a live URL.
- Create a one-page executive brief targeting: Head of Digital Assets at a tier-2 asset manager, COO of a tokenized credit fund, compliance officers at prime brokers. Lead with the business problem, not the tech.
- Build a `docker-compose.yml` that starts the full stack on a single `docker compose up` command. Reduce onboarding from 5 tool installs + 4 terminals to one.
- Create a distinct product brand: name the platform (e.g., `Archon Settlement Layer` or `VaultOTC`), add a logo/favicon, replace all `'prototype/simulate'` copy with `'platform/execute'`, remove the `'local Anvil + API + UI'` subtitle.
- Replace raw wei and scaled-integer inputs with human-readable fields. All blockchain encoding should happen invisibly in the API layer, not the UI.
- Wire the KYC module to a default SQLite or in-memory store so it functions without `DATABASE_URL` during demos.
- Target these specific buyer verticals: (1) tokenized money market and credit funds seeking compliant settlement rails; (2) prime brokerage desks at crypto-native banks handling bilateral fund token trades; (3) fund administrators (Apex, SS&C) offering white-label NAV registry; (4) family offices and hedge funds in Cayman, Luxembourg, Singapore.
- Move the hardcoded Anvil private key out of `start.sh` into a `.env.example` file and add `.env` to `.gitignore`.
- Add a `LICENSE` file and a basic commercialization tier document before any sales conversation.

---

## Next Steps

**Immediate action required in:** Legal & Compliance, Infrastructure & DevOps, Product Completeness, Go-to-Market, Smart Contract Hardening

### Top Priority Items (fix these first)

1. 🔴 **Authentication on all API routes** — currently any anonymous caller can mint tokens, post NAV, or mark wallets KYC-eligible
2. 🔴 **OTCTrade permissionless propose + settle** — `contracts/src/OTCTrade.sol` — critical fund drain vector
3. 🔴 **API bound to 127.0.0.1** — `apps/api/src/index.ts` — server is unreachable in any cloud deployment
4. 🔴 **Hardcoded localhost API URL** — `apps/web/lib/api.ts` — frontend is incompatible with any hosted deployment
5. 🔴 **No CI/CD pipeline** — every push is unvalidated; broken code can reach main silently

### Phased Remediation Path

| Phase | Focus | Outcome |
|-------|-------|---------|
| **Phase 1** (2–4 weeks) | Auth middleware, API binding, OTCTrade access control, CI/CD | System is securely deployable |
| **Phase 2** (4–6 weeks) | KYC on-chain gate, AML monitoring, NAV staleness, audit timestamps | System passes compliance review |
| **Phase 3** (6–8 weeks) | Docker/cloud deploy, brand identity, hosted demo, human-readable UI | System is demoable to buyers |
| **Phase 4** (8–12 weeks) | KMS integration, Reg D / MiCA compliance, seller consent mechanism | System is enterprise-saleable |

---

*Report produced by the OTC Governance Agent System · 5 specialist agents · Model: claude-sonnet-4-6*
