#!/usr/bin/env bash
set -e

# Stable for normal compilation
rustup toolchain install stable --component rust-src

# Nightly for anchor IDL build
rustup toolchain install nightly --component rust-src

# Verify
rustup show

echo "✅ Toolchains ready"
echo "Use: RUSTUP_TOOLCHAIN=nightly anchor build"
