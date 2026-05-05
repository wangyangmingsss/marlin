# @marlin/checkout

Embeddable checkout widget for Marlin stablecoin payments. Drop it into any website to accept crypto payments via a secure hosted iframe.

## Installation

```bash
npm install @marlin/checkout
# or
yarn add @marlin/checkout
# or
pnpm add @marlin/checkout
```

### CDN (no build step)

```html
<script src="https://unpkg.com/@marlin/checkout/dist/checkout.js"></script>
```

---

## Integration Patterns

### Pattern A: Data Attributes (vanilla HTML)

The simplest integration. Add `data-marlin-checkout` to any clickable element and the SDK auto-binds on page load.

```html
<script src="https://unpkg.com/@marlin/checkout/dist/checkout.js"></script>

<!-- One-time payment -->
<button data-marlin-checkout data-invoice-id="inv_abc123">
  Pay $25.00
</button>

<!-- Subscription -->
<button data-marlin-checkout data-plan-slug="pro-monthly" data-theme="dark">
  Subscribe
</button>
```

**Supported attributes:**

| Attribute           | Description                          |
| ------------------- | ------------------------------------ |
| `data-marlin-checkout` | Required. Marks the element.      |
| `data-invoice-id`   | Invoice ID for one-time payments.    |
| `data-plan-slug`    | Plan slug for subscriptions.         |
| `data-theme`        | `light`, `dark`, or `auto` (default) |

---

### Pattern B: Programmatic JavaScript

For full control, import and call `MarlinCheckout.open()` directly.

```js
import { MarlinCheckout } from '@marlin/checkout';

const handle = MarlinCheckout.open({
  invoiceId: 'inv_abc123',
  theme: 'dark',
  onSuccess: ({ invoiceId, txHash }) => {
    console.log('Payment successful!', { invoiceId, txHash });
    window.location.href = '/thank-you';
  },
  onError: ({ code, message }) => {
    console.error('Payment failed:', code, message);
  },
  onClose: () => {
    console.log('Widget closed');
  },
});

// Programmatically close the widget later:
// handle.close();
```

**`OpenOptions`:**

| Option       | Type       | Description                                |
| ------------ | ---------- | ------------------------------------------ |
| `invoiceId`  | `string`   | Invoice ID (one-time payment)              |
| `planSlug`   | `string`   | Plan slug (subscription)                   |
| `theme`      | `Theme`    | `'light'` \| `'dark'` \| `'auto'`         |
| `onSuccess`  | `function` | `({ invoiceId?, txHash? }) => void`        |
| `onError`    | `function` | `({ code, message }) => void`              |
| `onClose`    | `function` | `() => void`                               |

---

### Pattern C: React Component

```tsx
import { MarlinCheckoutButton } from '@marlin/checkout/react';

function CheckoutPage() {
  return (
    <MarlinCheckoutButton
      invoiceId="inv_abc123"
      theme="light"
      onSuccess={({ txHash }) => console.log('Paid!', txHash)}
      onError={({ message }) => alert(message)}
      className="btn btn-primary"
    >
      Pay with Crypto
    </MarlinCheckoutButton>
  );
}
```

#### `useMarlinCheckout` Hook

For custom UI, use the hook directly:

```tsx
import { useMarlinCheckout } from '@marlin/checkout/react';

function CustomButton({ invoiceId }: { invoiceId: string }) {
  const { open, loading } = useMarlinCheckout();

  return (
    <button onClick={() => open(invoiceId)} disabled={loading}>
      {loading ? 'Processing...' : 'Checkout'}
    </button>
  );
}
```

The hook also accepts a full options object:

```tsx
open({
  invoiceId: 'inv_abc123',
  theme: 'dark',
  onSuccess: (data) => router.push('/success'),
});
```

---

## Configuration

Override the widget URL (useful for staging/development):

```js
// Before any MarlinCheckout calls
globalThis.MARLIN_WIDGET_URL = 'https://staging-widget.marlin.fi';
```

## How It Works

1. `MarlinCheckout.open()` creates a full-screen dark backdrop overlay.
2. A sandboxed iframe loads the hosted checkout page from `widget.marlin.fi`.
3. The iframe communicates via `postMessage` events (`ready`, `resize`, `success`, `error`, `close`).
4. The widget closes on Escape key, backdrop click, or programmatic `handle.close()`.

No sensitive data is handled by the SDK itself -- all payment logic runs inside the secure hosted iframe.

## License

MIT
