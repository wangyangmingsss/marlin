# Checkout and Widget

## Two Modes

### 1. Hosted Checkout (Separate Next.js App)

Location: `apps/checkout/`

A standalone Next.js application that renders pay-by-link pages. Merchants share a URL; customers open it in any browser with a Solana wallet.

**Flow:**
1. Merchant creates invoice via API/Dashboard, gets a checkout URL with a unique token.
2. Customer opens the URL, sees invoice details (amount, merchant, memo).
3. Customer connects wallet, reviews transaction, and signs.
4. Payment settles on-chain; checkout page shows confirmation.

**Public API used:**
- `GET /api/public/invoice/:token` — fetch invoice details
- `POST /api/public/invoice/:token/build-payment-tx` — get unsigned transaction

### 2. Embeddable Widget (iframe + JS SDK)

A drop-in component for any website. Two integration options:

**React Component:**
```tsx
import { MarlinCheckout } from '@marlinfi/sdk/react';

<MarlinCheckout invoiceId="inv_abc123" onSuccess={handleSuccess} />
```

**Vanilla JS:**
```html
<script src="https://js.marlin.dev/widget.js"></script>
<script>
  Marlin.checkout({ invoiceId: 'inv_abc123' });
</script>
```

**How it works:**
- Renders an iframe pointing to the hosted checkout app.
- Parent page communicates via `postMessage` for events (success, cancel, error).
- Styled to match merchant branding where possible.

## Subscription Checkout

For subscription plans, the checkout flow includes:
1. Display plan details (amount, period, trial).
2. Customer authorizes token delegation.
3. First charge occurs immediately (or after trial).
