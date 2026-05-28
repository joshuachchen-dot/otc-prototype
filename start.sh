#!/usr/bin/env bash
# start.sh — launch Anvil, deploy contracts, API, and Web UI in one shot
# Usage: ./start.sh   OR   pnpm dev:all

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ANVIL_URL="http://127.0.0.1:8545"
DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
# Dev-only API key — randomly generated each run; never a committed static secret
DEV_API_KEY="dev-$(openssl rand -hex 12)"

# OTC test accounts (Anvil pre-funded accounts #1 and #2)
SELLER_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
BUYER_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

# ── Cleanup on exit ───────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  echo "Stopping all services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup INT TERM EXIT

# ── 1. Anvil ──────────────────────────────────────────────────────────────────
echo "▶  Starting Anvil on port 8545..."
anvil --host 127.0.0.1 --port 8545 --silent &
PIDS+=($!)

# Wait until Anvil accepts JSON-RPC calls
until curl -sf -X POST "$ANVIL_URL" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  > /dev/null 2>&1; do
  sleep 0.3
done
echo "   Anvil ready"

# ── 2. Deploy contracts ───────────────────────────────────────────────────────
echo "▶  Deploying contracts..."
DEPLOY_OUT=$(
  cd "$ROOT/contracts"
  DEPLOYER="$DEPLOYER" forge script script/Deploy.s.sol \
    --rpc-url "$ANVIL_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast 2>&1
)

# Parse deployed addresses from forge output
FUND_TOKEN_ADDRESS=$(echo "$DEPLOY_OUT" | grep "FundToken:"   | awk '{print $2}')
NAV_REGISTRY_ADDRESS=$(echo "$DEPLOY_OUT" | grep "NAVRegistry:" | awk '{print $2}')
OTC_TRADE_ADDRESS=$(echo "$DEPLOY_OUT"   | grep "OTCTrade:"    | awk '{print $2}')

echo "   FundToken:   $FUND_TOKEN_ADDRESS"
echo "   NAVRegistry: $NAV_REGISTRY_ADDRESS"
echo "   OTCTrade:    $OTC_TRADE_ADDRESS"

# Validate parsed addresses are non-empty before proceeding
[ -z "$FUND_TOKEN_ADDRESS" ]   && { echo "ERROR: FundToken address not parsed from deploy output"; exit 1; }
[ -z "$NAV_REGISTRY_ADDRESS" ] && { echo "ERROR: NAVRegistry address not parsed from deploy output"; exit 1; }
[ -z "$OTC_TRADE_ADDRESS" ]    && { echo "ERROR: OTCTrade address not parsed from deploy output"; exit 1; }

# Write addresses and dev API key to API .env
cat > "$ROOT/apps/api/.env" <<EOF
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=$PRIVATE_KEY
FUND_TOKEN_ADDRESS=$FUND_TOKEN_ADDRESS
NAV_REGISTRY_ADDRESS=$NAV_REGISTRY_ADDRESS
OTC_TRADE_ADDRESS=$OTC_TRADE_ADDRESS
PORT=3001
API_KEY=$DEV_API_KEY
EOF

# Write API base URL and key to web .env.local for Next.js
cat > "$ROOT/apps/web/.env.local" <<EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=$DEV_API_KEY
EOF

echo "   .env updated"

# ── 3. Whitelist test accounts for OTC trading ────────────────────────────────
echo "▶  Whitelisting OTC test accounts..."

# Helper to call a contract write via cast
cast_send() {
  cast send \
    --rpc-url "$ANVIL_URL" \
    --private-key "$PRIVATE_KEY" \
    "$@" > /dev/null 2>&1
}

cast_send "$FUND_TOKEN_ADDRESS" "setWhitelisted(address,bool)" "$SELLER_ADDR" true
cast_send "$FUND_TOKEN_ADDRESS" "setWhitelisted(address,bool)" "$BUYER_ADDR"  true
echo "   Seller ($SELLER_ADDR) whitelisted"
echo "   Buyer  ($BUYER_ADDR)  whitelisted"

# ── 4. API ────────────────────────────────────────────────────────────────────
echo "▶  Starting API on port 3001..."
(cd "$ROOT" && pnpm --filter @ots/api dev) &
PIDS+=($!)

# Wait for API to be ready (up to 30 s)
echo -n "   Waiting for API"
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3001/health > /dev/null 2>&1; then
    echo " ready"
    break
  fi
  echo -n "."
  sleep 0.5
done

# ── 5. Web UI ─────────────────────────────────────────────────────────────────
echo "▶  Starting Web UI on port 3000..."
(cd "$ROOT" && pnpm --filter @ots/web dev) &
PIDS+=($!)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Anvil   →  http://127.0.0.1:8545"
echo "  API     →  http://127.0.0.1:3001"
echo "  Web UI  →  http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OTC test accounts:"
echo "  Seller  →  $SELLER_ADDR"
echo "  Buyer   →  $BUYER_ADDR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Press Ctrl+C to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Keep script alive until Ctrl+C
wait
