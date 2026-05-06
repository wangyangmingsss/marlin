# Day-by-Day Sprint Plan

## 6-Day Build Sprint

### Day 1 — Foundation
- Monorepo scaffold (pnpm + Turborepo)
- Anchor program: all 13 instructions with tests
- Prisma schema: all 12 models with indexes
- Shared packages: PDA derivation, amount utils, types

### Day 2 — API + Auth
- SIWS authentication flow (nonce, login, logout, me)
- All REST API routes (invoices, plans, subscriptions, customers)
- Input validation with Zod schemas
- API key management and settings endpoints

### Day 3 — Dashboard
- Dashboard layout and navigation
- Invoice CRUD pages (list, create, detail)
- Subscription plan management pages
- Customer directory
- Settings page (webhook config, API keys)

### Day 4 — Checkout + Indexer
- Hosted checkout app (pay-by-link flow)
- Indexer service (Helius webhook handler + polling fallback)
- Event handlers for all instruction types
- Outbound webhook delivery via BullMQ

### Day 5 — SDK + Widget + Cron
- @marlinfi/sdk package (server-side + React)
- Embeddable checkout widget (iframe + postMessage)
- Subscription auto-charger cron worker
- Landing page polish

### Day 6 — Testing + Polish + Pitch
- E2E tests for critical flows
- Bug fixes and edge cases
- Demo video recording
- Pitch deck finalization
- Submission
