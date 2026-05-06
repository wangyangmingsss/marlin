# Agent Instructions

## Before You Start

1. Read ALL spec documents (01 through 13) before writing any code.
2. Understand the full architecture, data model, and API surface before implementation.

## Conventions

- Follow **Stripe API conventions** for naming, pagination, error responses, and webhook signatures.
- All API responses use `{ data, error }` shape. List endpoints return `{ data: [], has_more, cursor }`.
- Error codes follow HTTP semantics; body includes `code` and `message` fields.

## Git Workflow

- **Atomic commits** — each commit should represent a single logical change.
- Commit message format: `type(scope): description` (e.g., `feat(api): add invoice list endpoint`).
- Do not bundle unrelated changes in one commit.

## Code Standards

- TypeScript strict mode everywhere.
- Shared types and utilities go in `packages/shared`.
- Database access only through `@marlin/db` Prisma client.
- PDA derivation must use canonical helpers from `@marlin/shared`.
- Validate all inputs with Zod schemas before processing.

## Testing

- Write tests alongside features, not after.
- Anchor tests for on-chain logic, Vitest for API/util, Playwright for E2E.
