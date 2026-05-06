# Testing

## Testing Pyramid

### 1. Anchor Tests (On-Chain)

Location: `tests/` (root level)

- Test all 13 instructions against a local Solana validator.
- Verify PDA creation, token transfers, fee splits, and error conditions.
- Run with: `anchor test`

### 2. Unit Tests (Vitest)

Location: alongside source files (`*.test.ts`)

- Utility functions (amount conversion, PDA derivation, ULID generation).
- Zod schema validation.
- API route handler logic (mocked DB).
- Run with: `pnpm test`

### 3. Integration Tests

- API endpoint tests with a real database (test container or Supabase branch).
- Indexer event handler tests with fixture transaction data.
- Webhook delivery and retry logic.

### 4. E2E Tests (Playwright)

Location: `e2e/` or `tests/e2e/`

- Full user flows: connect wallet, create invoice, pay via checkout.
- Dashboard navigation and CRUD operations.
- Run with: `pnpm test:e2e`

## Running Tests

```bash
# All unit tests
pnpm test

# Anchor program tests (requires local validator)
anchor test

# E2E tests (requires running app)
pnpm test:e2e
```

## Key Testing Principles

- Write tests alongside features, not after.
- On-chain tests must cover both happy path and error cases.
- Mock external services (Helius, Resend) in unit tests.
- Use deterministic test wallets with known balances for Anchor tests.
