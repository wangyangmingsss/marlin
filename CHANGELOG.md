# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] - 2026-05-06

### Added

- **Anchor program** with 13 instructions: merchant init/update, invoice create/pay/void, subscription plan CRUD, subscribe/charge/pause/resume/cancel, update authorization
- **REST API** (Next.js App Router) with full CRUD for invoices, plans, subscriptions, customers, settings, and analytics
- **Authentication** via Sign-In With Solana (SIWS) + JWT sessions
- **Merchant dashboard** with real-time analytics, revenue charts, customer management, and settings pages
- **Hosted checkout** for invoices and subscription sign-ups
- **Embeddable checkout widget** (`@marlin/checkout-widget`) for React apps
- **TypeScript SDK** (`@marlinfi/sdk`) with server client, webhook verification, and React components
- **On-chain indexer** powered by Helius webhooks + polling fallback
- **Webhook delivery system** with HMAC-SHA256 signatures, retry queue, and delivery logs
- **Subscription auto-charger** cron worker for recurring billing
- **Multi-stablecoin support**: USDC, PYUSD, USDG
- **Confidential invoices** with off-chain encryption and on-chain commitment hashes
- **OpenAPI 3.0 specification** with Swagger UI at `/api-docs`
- **API key management** for programmatic access
- **E2E test suite** with Playwright covering auth flows, dashboard pages, and public endpoints
- **Smoke test script** for verifying deployed API health
- **Docker Compose** setup for local Postgres + Redis
- **CI pipeline** with GitHub Actions (lint, test, Anchor build, E2E)
- **Devnet deployment** at program ID `MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ`

### Security

- Non-custodial design: funds settle directly to merchant wallets
- Protocol fee of 0.5% enforced on-chain
- Delegate authority model for subscriptions with customer-controlled spending caps
