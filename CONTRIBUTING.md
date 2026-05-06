# Contributing to Marlin

Thank you for your interest in contributing to Marlin. This guide covers the workflow and conventions used across the repository.

---

## Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ |
| Rust | 1.78+ |
| Solana CLI | 1.18+ |
| Anchor | 0.30.x |
| PostgreSQL | 16+ |
| Redis | 7+ |

### Quick Start

```bash
# Clone the repo
git clone https://github.com/wangyangmingsss/marlin.git
cd marlin

# Install dependencies
pnpm install

# Start Postgres + Redis
docker compose up -d

# Configure environment
cp .env.example .env

# Run database migrations
pnpm prisma migrate dev

# Build the Anchor program
cd programs/marlin && anchor build && cd ../..

# Start all apps in dev mode
pnpm dev
```

---

## Project Structure

See the [README](./README.md) for a full breakdown of the monorepo layout. Key directories:

- `programs/marlin/` -- Anchor smart contract (Rust)
- `apps/dashboard/` -- Merchant dashboard + REST API (Next.js)
- `apps/checkout/` -- Hosted checkout flows
- `apps/indexer/` -- On-chain event indexer + webhook delivery
- `apps/cron/` -- Subscription auto-charger
- `packages/` -- Shared libraries (SDK, DB, UI, shared utils)
- `e2e/` -- Playwright end-to-end tests
- `scripts/` -- Seed data, smoke tests, deploy helpers

---

## Workflow

1. **Fork** the repository and clone your fork.
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
3. **Make changes** with tests where applicable.
4. **Run tests** to verify nothing is broken:
   ```bash
   pnpm test
   anchor test
   ```
5. **Commit** using the commit message format below.
6. **Push** your branch and open a Pull Request against `main`.

---

## Commit Message Format

All commits must follow:

```
<type>(<scope>): <subject>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Maintenance (deps, config, tooling) |
| `ci` | CI/CD pipeline changes |
| `build` | Build system or external dependency changes |
| `perf` | Performance improvement |

### Scopes

Use the package or app name: `sdk`, `dashboard`, `checkout`, `indexer`, `cron`, `shared`, `db`, `ui`, `program`, `e2e`, `scripts`, `ci`.

### Examples

```
feat(sdk): add webhook signature verification helper
fix(dashboard): correct timezone handling in revenue chart
docs(readme): add API endpoint reference table
refactor(program): extract fee calculation into utility
test(e2e): add checkout happy-path test
chore(deps): bump @solana/web3.js to 1.95
ci(github): add anchor build cache step
```

---

## Testing

```bash
# Unit tests (shared packages + SDK)
pnpm test

# Anchor program tests (requires local Solana validator)
anchor test

# End-to-end tests (requires running app)
pnpm e2e

# Smoke test against a deployed API
pnpm tsx scripts/smoke-test.ts

# Lint
pnpm lint
```

---

## Code Style

- TypeScript for all application code.
- Rust for the Anchor program.
- Prettier + ESLint configured at repo root.
- Run `pnpm lint` before committing.

---

## Security Reporting

If you discover a security vulnerability, please do **not** open a public issue.

Instead, email **security@marlin.fi** with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We will respond within 48 hours and coordinate a fix before public disclosure.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
