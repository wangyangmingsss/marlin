#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../programs/marlin"

# 1. Compile .so with stable
echo "Building .so with stable rust..."
anchor build --skip-lint   # uses default (stable) toolchain

# 2. Build IDL with nightly
echo "Building IDL with nightly rust..."
RUSTUP_TOOLCHAIN=nightly anchor idl build > target/idl/marlin.json

# 3. Build TS types
RUSTUP_TOOLCHAIN=nightly anchor idl type > target/types/marlin.ts || true

echo "✅ Build complete"
ls -la target/deploy/marlin.so target/idl/marlin.json
