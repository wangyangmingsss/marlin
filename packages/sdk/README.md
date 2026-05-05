# @marlin/sdk

TypeScript SDK for **Marlin** — stablecoin billing on Solana.

## Install

```bash
npm install @marlin/sdk
# or
pnpm add @marlin/sdk
```

## Quick Start

### Create an Invoice

```ts
import { Marlin } from "@marlin/sdk";

const marlin = new Marlin({ apiKey: process.env.MARLIN_API_KEY! });

const invoice = await marlin.invoices.create({
  customerId: "cus_abc123",
  lineItems: [
    { description: "Pro Plan — May 2025", quantity: 1, unitAmount: 4900 },
  ],
});

console.log(invoice.id, invoice.paymentUrl);
```

### List Customers (Paginated)

```ts
const page = await marlin.customers.list({ limit: 20 });

for (const customer of page.data) {
  console.log(customer.email);
}

if (page.nextCursor) {
  const nextPage = await marlin.customers.list({
    limit: 20,
    cursor: page.nextCursor,
  });
}
```

### Verify a Webhook

```ts
import { verifyWebhook } from "@marlin/sdk";

const event = verifyWebhook({
  payload: rawBody,
  signature: req.headers["marlin-signature"] as string,
  secret: process.env.MARLIN_WEBHOOK_SECRET!,
});

switch (event.type) {
  case "invoice.paid":
    console.log("Invoice paid:", event.data);
    break;
}
```

### React Checkout

```tsx
import { MarlinProvider, MarlinCheckoutButton } from "@marlin/sdk/react";

function App() {
  return (
    <MarlinProvider publishableKey="pk_live_...">
      <MarlinCheckoutButton
        invoiceId="inv_abc123"
        onSuccess={(result) => console.log("Paid!", result)}
        onCancel={() => console.log("Cancelled")}
      />
    </MarlinProvider>
  );
}
```

## API Reference

### `new Marlin(config)`

| Option       | Type     | Default                    | Description                  |
| ------------ | -------- | -------------------------- | ---------------------------- |
| `apiKey`     | `string` | **required**               | Your Marlin secret API key   |
| `baseUrl`    | `string` | `https://api.marlin.dev`   | API base URL                 |
| `timeout`    | `number` | `30000`                    | Request timeout in ms        |
| `maxRetries` | `number` | `2`                        | Max retries on 5xx errors    |

### Resources

- **`marlin.invoices`** — `create`, `retrieve`, `list`, `void`, `send`
- **`marlin.plans`** — `create`, `retrieve`, `list`, `update`
- **`marlin.subscriptions`** — `list`, `retrieve`, `pause`, `resume`, `cancel`
- **`marlin.customers`** — `create`, `retrieve`, `list`, `update`

### Error Handling

```ts
import { MarlinAPIError } from "@marlin/sdk";

try {
  await marlin.invoices.retrieve("inv_nonexistent");
} catch (err) {
  if (err instanceof MarlinAPIError) {
    console.error(err.statusCode, err.code, err.message);
  }
}
```

## License

MIT
