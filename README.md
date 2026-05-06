<div align="center">

# Marlin

**Stripe Billing for stablecoins on Solana.**

Invoices · Subscriptions · Hosted Checkout · Embeddable Widget · REST API · SDK · Webhooks

[![CI](https://github.com/wangyangmingsss/marlin/actions/workflows/ci.yml/badge.svg)](https://github.com/wangyangmingsss/marlin/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@marlinfi/sdk?style=flat-square&logo=npm)](https://www.npmjs.com/package/@marlinfi/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Built for Solana Frontier 2026](https://img.shields.io/badge/Solana%20Frontier-2026-9945FF?style=flat-square)](https://www.colosseum.org/)

</div>

---

## Live on Solana devnet

Marlin is deployed and operational on Solana devnet.

| Property | Value |
|----------|-------|
| **Program ID** | `MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ` |
| **Cluster** | devnet |
| **Explorer** | [View on Solscan](https://solscan.io/account/MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ?cluster=devnet) |
| **USDC devnet mint** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

---

## What is Marlin?

Marlin is the financial OS for businesses accepting stablecoin payments on Solana. While other tools help you accept a one-off USDC payment, Marlin gives you the full operating layer Stripe gives traditional businesses — invoices, subscriptions, customer records, reconciliation, webhooks, dashboards, SDKs — but settled on-chain in stablecoins.

Built for the [Solana Frontier 2026](https://www.colosseum.org/) hackathon.

## Why now?

The stablecoin payments stack came online in the last 30 days:

- **Visa** added Solana to its settlement network *(May 3, 2026)*
- **Circle** minted $750M USDC on Solana in a single transaction *(May 1, 2026)*
- **Western Union** announced USDPT on Solana *(May 2026)*
- **Stripe** integrated stablecoin payments via MPP

The infrastructure of money has shipped on-chain. The infrastructure of *running a business* has not. Marlin is that layer.

---

## Features

### For merchants
- **Invoices** — create, send, track, refund. Stablecoin-native, hosted checkout included
- **Subscriptions** — true delegated recurring charges. Customer authorizes once, Marlin charges on schedule
- **Hosted Checkout** — beautiful pay-by-link page that works with any Solana wallet
- **Dashboard** — real-time view of every payment, customer, and subscription
- **Multi-stablecoin** — USDC, PYUSD, USDG out of the box
- **Confidential Invoices** — privacy-preserving invoices with encrypted details (see below)
- **50 bps flat fee** — no monthly costs, no per-customer pricing tiers

### For developers
- **REST API** — the endpoints you'd expect from Stripe, mapped to stablecoin primitives
- **TypeScript SDK** — `npm install @marlinfi/sdk`
- **Signed Webhooks** — HMAC-SHA256, with the same DX as Stripe's `Stripe-Signature` header
- **Embeddable Widget** — drop a `<MarlinCheckout />` component into any React app
- **OpenAPI 3.0 spec** — generated client libraries, type-safe everywhere

### Non-custodial by design
Funds settle directly to the merchant's wallet on-chain. Marlin never holds customer funds beyond a per-invoice escrow PDA controlled by the smart contract.

---

## SDK

Install the TypeScript SDK:

```bash
npm install @marlinfi/sdk
```

Usage:

```typescript
import { MarlinClient } from '@marlinfi/sdk';

const marlin = new MarlinClient({ apiKey: 'mk_live_...' });

// Create an invoice
const invoice = await marlin.invoices.create({
  amount: 100_00, // $100.00 in minor units
  mint: 'USDC',
  customerEmail: 'customer@example.com',
});
```

The SDK includes server-side client, webhook signature verification, and React components for embedding checkout flows.

---

## Confidential Invoices

Marlin supports privacy-preserving invoices for merchants who need to keep billing details confidential while still settling on-chain.

**How it works:**

1. Invoice details (line items, amounts, customer info) are encrypted off-chain using the merchant's public key
2. A commitment hash (`SHA-256(encrypted_payload)`) is stored on-chain in the Invoice PDA
3. Only the merchant (or authorized parties with the decryption key) can view the full invoice details
4. On-chain observers see the payment amount and commitment hash, but not the business context

This enables use cases like B2B invoicing, payroll, and legal settlements where on-chain transparency of payment amounts is acceptable but disclosure of line-item details is not.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Merchant / Customer                      │
└────────────┬───────────────────┬──────────────────┬─────────┘
             │                   │                  │
   ┌─────────▼────────┐ ┌────────▼────────┐ ┌───────▼───────┐
   │   Dashboard       │ │  Hosted Checkout │ │  Embed Widget │
   │   (Next.js)       │ │   (Next.js)      │ │  (React/JS)   │
   └─────────┬────────┘ └────────┬────────┘ └───────┬───────┘
             │                   │                  │
             └─────────┬─────────┴──────────────────┘
                       │
              ┌────────▼────────┐
              │   REST API      │
              │   (Next.js)     │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼─────┐ ┌──────▼──────┐
│  Postgres    │ │  Indexer  │ │ Webhook Q  │ │ Subs Cron   │
│  (Supabase)  │ │  (Helius) │ │ (BullMQ)   │ │ (Railway)   │
└──────────────┘ └─────┬─────┘ └────────────┘ └──────┬──────┘
                       │                              │
                ┌──────▼──────────────────────────────▼──────┐
                │       Solana — Marlin Anchor Program       │
                └────────────────────────────────────────────┘
```

## Tech stack

- **Smart contracts:** Anchor 0.30, Rust, Solana 1.18+
- **API + Dashboard:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui
- **Database:** Postgres (Supabase) via Prisma
- **Queue:** BullMQ on Upstash Redis
- **RPC + Indexing:** Helius
- **Hosting:** Vercel (web), Railway (workers + cron)
- **Email:** Resend
- **Monorepo:** Turborepo + pnpm

---

## Repo structure

```
marlin/
├── programs/marlin/           # Anchor program (Rust) — 13 instructions
│   ├── src/
│   │   ├── lib.rs             # Program entrypoint + constants
│   │   ├── errors.rs          # Custom error codes
│   │   ├── state/             # Account structs (Merchant, Invoice, Plan, Subscription)
│   │   └── instructions/      # All instruction handlers
├── tests/                     # Anchor program integration tests
├── apps/
│   ├── dashboard/             # Merchant dashboard + API routes (Next.js 14)
│   │   ├── app/
│   │   │   ├── (marketing)/   # Landing page
│   │   │   ├── (auth)/        # Connect wallet + onboarding
│   │   │   ├── (dashboard)/   # Authenticated dashboard pages
│   │   │   └── api/           # REST API endpoints
│   │   ├── components/        # React components
│   │   └── lib/               # Auth, schemas, Solana helpers
│   ├── checkout/              # Hosted checkout (Next.js) — invoice & subscription flows
│   ├── indexer/               # On-chain event indexer (Helius + polling) + webhook delivery
│   └── cron/                  # Subscription auto-charger worker
├── packages/
│   ├── shared/                # @marlin/shared — types, PDA derivation, amount utils
│   ├── db/                    # @marlin/db — Prisma schema + client
│   ├── ui/                    # @marlin/ui — Button, Badge, Card, Input, Skeleton + utilities
│   ├── sdk/                   # @marlinfi/sdk — TypeScript SDK (server + React)
│   └── checkout-widget/       # @marlin/checkout-widget — embeddable iframe widget
├── e2e/                       # Playwright E2E tests
├── scripts/                   # Seed data + smoke tests
└── docs/                      # Internal architecture specs
```

---

## API documentation

The REST API is fully documented via an OpenAPI 3.0 specification:

- **OpenAPI spec:** `/api/openapi.json`
- **Swagger UI:** `/api-docs`

Use the OpenAPI spec to generate typed clients in any language or import directly into Postman/Insomnia.

---

## Smart contract instructions

The Anchor program implements 13 instructions covering the full billing lifecycle:

| # | Instruction | Description |
|---|---|---|
| 1 | `initialize_merchant` | Create merchant PDA, set default mint |
| 2 | `update_merchant` | Update display name or settlement mint |
| 3 | `create_invoice` | Create invoice PDA in Open status |
| 4 | `pay_invoice` | Customer pays — splits amount (99.5% merchant, 0.5% protocol fee) |
| 5 | `void_invoice` | Merchant voids unpaid invoice |
| 6 | `create_subscription_plan` | Create recurring billing plan |
| 7 | `set_plan_active` | Toggle plan active/inactive |
| 8 | `subscribe` | Customer subscribes + delegates token authority |
| 9 | `charge_subscription` | Permissionless — anyone can trigger due charges |
| 10 | `pause_subscription` | Customer or merchant pauses |
| 11 | `resume_subscription` | Resume from paused/failed state |
| 12 | `cancel_subscription` | Cancel + revoke delegate |
| 13 | `update_subscription_authorization` | Customer increases spending cap |

## API endpoints

### Auth
- `GET /api/auth/nonce` — Get SIWS message to sign
- `POST /api/auth/login` — Verify signature, issue JWT
- `POST /api/auth/logout` — Clear session
- `GET /api/auth/me` — Current merchant

### Invoices
- `POST /api/invoices` — Create invoice (returns unsigned tx)
- `GET /api/invoices` — List with filters
- `GET /api/invoices/:id` — Single invoice
- `POST /api/invoices/:id/void` — Void invoice

### Subscription Plans
- `POST /api/plans` — Create plan
- `GET /api/plans` — List plans
- `PATCH /api/plans/:id` — Update plan

### Subscriptions
- `GET /api/subscriptions` — List subscriptions
- `POST /api/subscriptions/:id/pause` — Pause
- `POST /api/subscriptions/:id/resume` — Resume
- `POST /api/subscriptions/:id/cancel` — Cancel

### Customers
- `GET /api/customers` — List customers
- `POST /api/customers` — Create customer
- `PATCH /api/customers/:id` — Update customer

### Public (no auth)
- `GET /api/public/invoice/:token` — Invoice details for checkout
- `POST /api/public/invoice/:token/build-payment-tx` — Build payment transaction
- `GET /api/public/plan/:slug` — Plan details for subscription

### Settings
- `GET/PUT /api/settings/webhook` — Webhook configuration
- `GET/POST/DELETE /api/settings/api-keys` — API key management

---

## Data model

### On-chain (Solana PDAs)
- **Merchant** — authority, merchant_id, display_name, settlement_mint, total_volume
- **Invoice** — merchant, amount, mint, status (Open/Paid/Void/Expired), customer_wallet
- **SubscriptionPlan** — merchant, amount_per_period, mint, period_seconds, trial_seconds
- **Subscription** — plan, customer, next_charge_at, charges_count, total_charged, max_authorized

### Off-chain (PostgreSQL via Prisma)
12 models: Merchant, Customer, Invoice, InvoiceView, SubscriptionPlan, Subscription, Charge, ApiKey, WebhookDelivery, AuthNonce, IndexerCheckpoint, ProcessedTx

---

## Local development

### Prerequisites
- Node.js 20+, pnpm 9+
- Rust 1.78+, Solana CLI 1.18+, Anchor 0.30
- Postgres 16, Redis 7

### Setup

```bash
git clone https://github.com/wangyangmingsss/marlin.git
cd marlin

# Install dependencies
pnpm install

# Start local services
docker compose up -d

# Copy env
cp .env.example .env

# Run migrations
pnpm prisma migrate dev

# Build Anchor program
cd programs/marlin && anchor build && cd ../..

# Start everything
pnpm dev
```

---

## Testing

```bash
# Unit tests (shared packages + SDK)
pnpm test

# Anchor program tests (requires local Solana validator)
anchor test

# E2E tests (requires running app)
pnpm e2e

# Smoke test against deployed API
pnpm tsx scripts/smoke-test.ts
```

### Test Coverage
- **Anchor tests**: All 13 instructions — happy path + error cases (invalid amounts, unauthorized signers, period too short, insufficient authorization)
- **Unit tests**: Amount parsing/formatting, PDA derivation, address validation, ULID encoding, mint helpers, error mapping, webhook signature verification
- **E2E tests**: Landing page, dashboard auth guards, API endpoint auth, public endpoints, checkout pages

---

## Pricing

**50 basis points (0.5%) per settled payment. That's it.**

- No monthly fees
- No per-customer fees
- No setup fees
- No charges on failed payments

---

## License

[MIT](./LICENSE)

---

## Disclaimer

Marlin is live on Solana devnet. Mainnet deployment is pending a security audit. Do not use with real funds until mainnet launch is announced.

---

<div align="center">

**Marlin — Stablecoin billing is now.**

Built for the [Solana Frontier 2026 Hackathon](https://www.colosseum.org/).

</div>
