# Deployment

## Hosting Overview

| Component         | Platform  | Notes                                  |
|-------------------|-----------|----------------------------------------|
| Dashboard app     | Vercel    | Next.js 14, automatic preview deploys  |
| Hosted Checkout   | Vercel    | Separate Vercel project                |
| Indexer service   | Railway   | Long-running Node.js process           |
| Subs cron worker  | Railway   | Scheduled job for recurring charges    |
| PostgreSQL        | Supabase  | Managed Postgres with connection pooling|
| Redis             | Upstash   | Serverless Redis for BullMQ queues     |
| Email             | Resend    | Transactional invoice emails           |

## Environment Variables

Key variables needed across services:

- `DATABASE_URL` — Supabase Postgres connection string
- `REDIS_URL` — Upstash Redis URL
- `HELIUS_API_KEY` — Helius RPC and webhook access
- `HELIUS_WEBHOOK_SECRET` — Verify inbound Helius webhooks
- `JWT_SECRET` — Session token signing
- `RESEND_API_KEY` — Email delivery
- `NEXT_PUBLIC_SOLANA_NETWORK` — `devnet` or `mainnet-beta`
- `MARLIN_PROGRAM_ID` — Deployed Anchor program address
- `PROTOCOL_FEE_WALLET` — Wallet receiving 0.5% fees

## Solana Program Deployment

```bash
anchor build
anchor deploy --provider.cluster devnet
# Record program ID and update .env
```

## CI/CD

- Vercel auto-deploys on push to `main` for web apps.
- Railway auto-deploys on push for indexer and cron services.
- Anchor program deployed manually via CLI.
