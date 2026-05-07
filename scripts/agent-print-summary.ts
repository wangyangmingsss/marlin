#!/usr/bin/env tsx
import * as fs from 'fs'

const state = JSON.parse(fs.readFileSync('.marlin-seed-state.json', 'utf-8'))
const programId = process.env.MARLIN_PROGRAM_ID_DEVNET || 'MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ'

const tx = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`
const acct = (a: string) => `https://solscan.io/account/${a}?cluster=devnet`
const tok = (m: string) => `https://solscan.io/token/${m}?cluster=devnet`

let md = `# Marlin Devnet Activity\n\n`
md += `**Program**: [\`${programId}\`](${acct(programId)})\n\n`
md += `**Cluster**: Solana devnet\n\n`

md += `## Mints\n\n`
const mints = JSON.parse(fs.readFileSync('.marlin-mints.json', 'utf-8'))
md += `| Token | Mint | Solscan |\n|---|---|---|\n`
md += `| Mock PYUSD | \`${mints.pyusd.mint}\` | [view](${mints.pyusd.solscan}) |\n`
md += `| Mock USDG | \`${mints.usdg.mint}\` | [view](${mints.usdg.solscan}) |\n\n`

md += `## Merchants\n\n| Name | PDA | Init tx |\n|---|---|---|\n`
for (const [name, m] of Object.entries(state.merchants) as any) {
  if (m.tx === 'pre-existing') {
    md += `| ${name} | [\`${m.pda.slice(0, 8)}…\`](${acct(m.pda)}) | (pre-existing) |\n`
  } else {
    md += `| ${name} | [\`${m.pda.slice(0, 8)}…\`](${acct(m.pda)}) | [tx](${tx(m.tx)}) |\n`
  }
}

md += `\n## Invoices\n\n| Merchant | Mint | Amount | Status | Tx |\n|---|---|---|---|---|\n`
for (const inv of state.invoices) {
  const sym = inv.mint === mints.pyusd.mint ? 'PYUSD'
    : inv.mint === mints.usdg.mint ? 'USDG' : 'USDC'
  const amount = (Number(inv.amount) / 1_000_000).toFixed(2)
  md += `| ${inv.merchant} | ${sym} | $${amount} | ${inv.status} | [tx](${tx(inv.tx)}) |\n`
}

md += `\n## Payments\n\n| Payer | Invoice | Tx |\n|---|---|---|\n`
for (const p of state.payments) {
  md += `| ${p.payer} | [\`${p.invoicePda.slice(0, 8)}…\`](${acct(p.invoicePda)}) | [tx](${tx(p.tx)}) |\n`
}

md += `\n## Voided Invoices\n\n| Invoice | Tx |\n|---|---|\n`
for (const v of state.voids) {
  md += `| [\`${v.invoicePda.slice(0, 8)}…\`](${acct(v.invoicePda)}) | [tx](${tx(v.tx)}) |\n`
}

if (state.plans.length > 0) {
  md += `\n## Subscription Plans\n\n| Merchant | PDA | Tx |\n|---|---|---|\n`
  for (const p of state.plans) {
    md += `| ${p.merchant} | [\`${p.pda.slice(0, 8)}…\`](${acct(p.pda)}) | [tx](${tx(p.tx)}) |\n`
  }
}

if (state.subs.length > 0) {
  md += `\n## Subscriptions\n\n| Customer | PDA | Tx |\n|---|---|---|\n`
  for (const s of state.subs) {
    md += `| ${s.customer} | [\`${s.pda.slice(0, 8)}…\`](${acct(s.pda)}) | [tx](${tx(s.tx)}) |\n`
  }
}

md += `\n---\n\nGenerated from \`.marlin-seed-state.json\` on ${new Date().toISOString()}\n`

fs.mkdirSync('docs', { recursive: true })
fs.writeFileSync('docs/devnet-activity.md', md)
console.log(`✅ Wrote docs/devnet-activity.md`)
const totalLinks = Object.values(state.merchants).filter((m: any) => m.tx !== 'pre-existing').length +
  state.invoices.length + state.payments.length + state.voids.length +
  state.plans.length + state.subs.length + state.charges.length
console.log(`Total tx links: ${totalLinks}`)
