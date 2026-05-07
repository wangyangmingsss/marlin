#!/usr/bin/env bash
set -e

echo "── Checking environment ─────────────────────"

# 1. .env loaded?
DEPLOYER_KEYPAIR_PATH="${DEPLOYER_KEYPAIR_PATH:-$HOME/.marlin/deployer.json}"
SOLANA_RPC_URL="${SOLANA_RPC_URL:-https://api.devnet.solana.com}"

test -f "$DEPLOYER_KEYPAIR_PATH" || { echo "❌ Deployer keypair file not found at $DEPLOYER_KEYPAIR_PATH"; exit 1; }

# 2. Tools
solana --version || { echo "❌ solana CLI not installed"; exit 1; }
node --version    || { echo "❌ node not installed"; exit 1; }

# 3. Configure CLI to use the deployer wallet on devnet
solana config set --keypair "$DEPLOYER_KEYPAIR_PATH" --url "$SOLANA_RPC_URL" >/dev/null

# 4. Verify wallet has enough SOL
DEPLOYER=$(solana address)
BALANCE=$(solana balance | grep -oE '[0-9.]+')
echo "Deployer wallet: $DEPLOYER"
echo "Balance: $BALANCE SOL"
echo "RPC URL: $SOLANA_RPC_URL"

echo "✅ Pre-flight OK"
