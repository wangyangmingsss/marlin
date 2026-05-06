# Indexer

## Overview

The indexer service (`apps/indexer/`) watches on-chain Marlin program transactions and mirrors state changes into the PostgreSQL database. It serves as the bridge between on-chain truth and the off-chain read model.

## Architecture

```
Solana Program Events
        │
        ├──► Helius Webhooks (primary, real-time)
        │
        └──► Polling Fallback (periodic, catches missed events)
                │
                ▼
        Event Handlers
        (parse tx → extract instruction + accounts)
                │
                ▼
        Database Updates
        (upsert Merchant, Invoice, Subscription, etc.)
                │
                ▼
        Outbound Webhooks
        (enqueue to BullMQ → deliver to merchant endpoints)
```

## Flow

1. **Ingest**: Helius sends webhook POST for each confirmed transaction involving the Marlin program.
2. **Dedup**: Check `ProcessedTx` table to skip already-handled transactions.
3. **Parse**: Decode instruction data and event logs from the transaction.
4. **Handle**: Route to the appropriate handler based on instruction discriminator.
5. **Persist**: Update the relevant Prisma models (Invoice status, Subscription state, etc.).
6. **Notify**: If the merchant has a webhook URL configured, enqueue a delivery job to BullMQ.
7. **Checkpoint**: Update `IndexerCheckpoint` so polling can resume from the correct slot.

## Polling Fallback

A periodic job queries Helius/RPC for recent program transactions since the last checkpoint. This catches any events missed by the webhook (network issues, webhook downtime).

## Outbound Webhooks

- Payload signed with HMAC-SHA256 (same format as Stripe's `Stripe-Signature` header).
- Retries with exponential backoff via BullMQ.
- Delivery attempts logged in `WebhookDelivery` table.
