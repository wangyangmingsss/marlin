# Product Overview

## What is Marlin?

Marlin is **Stripe Billing for stablecoin businesses on Solana**. It provides the full operating layer that Stripe gives traditional businesses — invoices, subscriptions, customer records, reconciliation, webhooks, dashboards, and SDKs — but settled on-chain in stablecoins.

Built for the Solana Frontier 2026 hackathon.

## Five Surfaces

1. **Dashboard** — Merchant-facing Next.js app for managing invoices, subscriptions, customers, and settings.
2. **Hosted Checkout** — Standalone Next.js app providing pay-by-link pages for any Solana wallet.
3. **Embeddable Widget** — Drop-in `<MarlinCheckout />` React component (iframe + JS SDK) for any website.
4. **REST API** — Stripe-convention API endpoints for programmatic access to all billing primitives.
5. **TypeScript SDK** — `@marlinfi/sdk` package for server-side and React integration.

## Supported Stablecoins

| Token | Networks        |
|-------|-----------------|
| USDC  | Mainnet, Devnet |
| PYUSD | Mainnet, Devnet |
| USDG  | Mainnet, Devnet |

## Pricing

50 basis points (0.5%) per settled payment. No monthly fees, no per-customer fees, no setup fees.

## Non-Custodial Design

Funds settle directly to the merchant's wallet on-chain. Marlin never holds customer funds beyond a per-invoice escrow PDA controlled by the smart contract.
