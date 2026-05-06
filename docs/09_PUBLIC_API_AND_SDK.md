# Public API and SDK

## @marlinfi/sdk Package

Location: `packages/sdk/` (planned)

The TypeScript SDK provides a convenient wrapper around the Marlin REST API for both server-side and client-side usage.

## Installation

```bash
npm install @marlinfi/sdk
```

## Server-Side Usage

```typescript
import { Marlin } from '@marlinfi/sdk';

const marlin = new Marlin({ apiKey: 'mk_live_...' });

// Create an invoice
const invoice = await marlin.invoices.create({
  amount: 100_000_000, // 100 USDC (6 decimals)
  mint: 'USDC',
  memo: 'Order #1234',
  customerWallet: 'CuStOmEr...',
});

// List subscriptions
const subs = await marlin.subscriptions.list({ status: 'active' });
```

## React Integration

```tsx
import { MarlinProvider, MarlinCheckout } from '@marlinfi/sdk/react';

function App() {
  return (
    <MarlinProvider publishableKey="mk_pub_...">
      <MarlinCheckout
        invoiceId="inv_abc123"
        onSuccess={(result) => console.log('Paid!', result)}
        onCancel={() => console.log('Cancelled')}
      />
    </MarlinProvider>
  );
}
```

## SDK Resources

| Resource          | Methods                           |
|-------------------|-----------------------------------|
| `invoices`        | create, list, get, void           |
| `plans`           | create, list, update              |
| `subscriptions`   | list, pause, resume, cancel       |
| `customers`       | create, list, update              |
| `webhooks`        | constructEvent (verify signature) |

## Webhook Verification

```typescript
const event = marlin.webhooks.constructEvent(body, signature, secret);
// Returns typed event object, throws if signature invalid
```
