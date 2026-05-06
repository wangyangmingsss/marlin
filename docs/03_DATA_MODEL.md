# Data Model

## On-Chain Accounts (Solana PDAs)

### Merchant
- `authority` (wallet), `merchant_id`, `display_name`, `settlement_mint`, `total_volume`
- PDA seed: `["merchant", authority]`

### Invoice
- `merchant`, `amount`, `mint`, `status` (Open | Paid | Void | Expired), `customer_wallet`
- PDA seed: `["invoice", merchant, invoice_id]`

### SubscriptionPlan
- `merchant`, `amount_per_period`, `mint`, `period_seconds`, `trial_seconds`
- PDA seed: `["plan", merchant, plan_id]`

### Subscription
- `plan`, `customer`, `next_charge_at`, `charges_count`, `total_charged`, `max_authorized`
- PDA seed: `["subscription", plan, customer]`

## Off-Chain Database (PostgreSQL via Prisma)

Schema location: `packages/db/prisma/schema.prisma`

### 12 Models

| Model              | Purpose                                         |
|--------------------|--------------------------------------------------|
| Merchant           | Merchant profile, wallet, API config             |
| Customer           | Customer records linked to wallets               |
| Invoice            | Invoice metadata, amounts, status                |
| InvoiceView        | Tracks invoice page views for analytics          |
| SubscriptionPlan   | Recurring billing plan definitions               |
| Subscription       | Active subscription instances                    |
| Charge             | Individual charge records for subscriptions      |
| ApiKey             | Merchant API keys (hashed)                       |
| WebhookDelivery    | Outbound webhook delivery log                    |
| AuthNonce          | SIWS authentication nonces                       |
| IndexerCheckpoint  | Indexer cursor position for replay               |
| ProcessedTx        | Deduplication of processed transactions          |

## Relationship: On-Chain to Off-Chain

The indexer watches on-chain events and mirrors state into Postgres. The off-chain DB is the read model; the on-chain program is the source of truth for funds and billing state.
