#!/usr/bin/env tsx
import * as fs from 'fs'

const state = JSON.parse(fs.readFileSync('.marlin-seed-state.json', 'utf-8'))
const mints = JSON.parse(fs.readFileSync('.marlin-mints.json', 'utf-8'))
const programId = process.env.MARLIN_PROGRAM_ID_DEVNET || 'MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ'

const tx = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`
const acct = (a: string) => `https://solscan.io/account/${a}?cluster=devnet`

const txCount =
  Object.values(state.merchants).filter((m: any) => m.tx !== 'pre-existing').length +
  state.invoices.length + state.payments.length + state.voids.length +
  state.plans.length + state.subs.length + state.charges.length

console.log(`## Live on Solana devnet

> **Status**: Live on devnet. Mainnet deployment pending security audit.

| | |
|---|---|
| Program ID | \`${programId}\` |
| Cluster | devnet |
| [View program on Solscan](${acct(programId)}) | |
| Mock PYUSD mint | [\`${mints.pyusd.mint.slice(0, 8)}…\`](${mints.pyusd.solscan}) |
| Mock USDG mint  | [\`${mints.usdg.mint.slice(0, 8)}…\`](${mints.usdg.solscan}) |

### Devnet activity

**${txCount} real on-chain transactions** demonstrate the full lifecycle:

- ${Object.keys(state.merchants).length} merchants initialized (Acme Coffee, Taylor Design, DevOps Co, Newsletter Pro, DePIN Operator)
- ${state.invoices.length} invoices created across PYUSD, USDG stablecoins
- ${state.payments.length} invoices paid by ${new Set(state.payments.map((p: any) => p.payer)).size} different customer wallets
- ${state.voids.length} invoices voided
- ${state.plans.length} subscription plans, ${state.subs.length} active subscriptions, ${state.charges.length} recurring charges

[Browse all activity in docs/devnet-activity.md →](./docs/devnet-activity.md)

**Sample transactions**:

${state.payments.slice(0, 3).map((p: any) =>
  \`- [Payment by \${p.payer}](\${tx(p.tx)})\`
).join('\\n')}
`)
