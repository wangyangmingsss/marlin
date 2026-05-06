import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function ulid(): string {
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const time = Date.now()
  let str = ''
  let t = time
  for (let i = 9; i >= 0; i--) {
    str = ENCODING[t % 32] + str
    t = Math.floor(t / 32)
  }
  for (let i = 0; i < 16; i++) {
    str += ENCODING[Math.floor(Math.random() * 32)]
  }
  return str
}

async function main() {
  console.log('Seeding database...')

  // --- Merchant ---
  const merchantId = ulid()
  const merchant = await prisma.merchant.create({
    data: {
      id: merchantId,
      walletAddress: '7XSY4Mq5r9Gf8Kp2VbNcAeDhWJ6nRtU3ZxPmLs1wQoB',
      label: 'Acme Coffee Shop',
      webhookUrl: null,
    },
  })
  console.log(`Created merchant: ${merchant.label}`)

  // --- Customers ---
  const customerData = [
    { label: 'Alice Johnson', email: 'alice@example.com', walletAddress: '3Fk8rPQ7vXm2Yz9LsNdWcJeH4gTpU6aBx1Ro5iKwMnE' },
    { label: 'Bob Martinez', email: 'bob.martinez@gmail.com', walletAddress: '9Hn4tLm6jKp3Qr8WxCvBdAeS5fG7iYoU2Zl1RwXaNbE' },
    { label: 'Carol Wei', email: 'carol.wei@company.co', walletAddress: 'BpR7mK3nF9xL2Qe4JcWvY6sHdA8tG1iZoU5wXaN0bEf' },
    { label: 'David Okafor', email: 'david.ok@protonmail.com', walletAddress: '5Gn2rLk8mP4Qx9WtCvBjAeH7fS3iYoU6Zl1RwXaN0bD' },
    { label: 'Elena Petrov', email: 'elena.p@startup.io', walletAddress: 'Ht6mK3nF9xL2Qe4JcWvY8sRdA7tG1iZoU5wXaN0bEfP' },
    { label: 'Frank Tanaka', email: 'frank.tanaka@email.jp', walletAddress: '2Jk9pLm6nR4Qx8WtCvBdAeH5fS3iYoU7Zl1GwXaN0bE' },
  ]

  const customers = await Promise.all(
    customerData.map((c) =>
      prisma.customer.create({
        data: {
          id: ulid(),
          merchantId,
          label: c.label,
          email: c.email,
          walletAddress: c.walletAddress,
        },
      })
    )
  )
  console.log(`Created ${customers.length} customers`)

  // --- Invoices ---
  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000)
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000)

  const invoiceData = [
    // 5 paid
    { customerId: customers[0].id, amount: 4_500_000_000n, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', status: 'Paid' as const, expiresAt: daysAgo(10), paidAt: daysAgo(12), memo: 'Cold brew subscription - January' },
    { customerId: customers[1].id, amount: 1_250_000_000n, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', status: 'Paid' as const, expiresAt: daysAgo(8), paidAt: daysAgo(9), memo: 'Catering order #1042' },
    { customerId: customers[2].id, amount: 8_900_000_000n, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', status: 'Paid' as const, expiresAt: daysAgo(5), paidAt: daysAgo(6), memo: 'Office coffee supply Q1' },
    { customerId: customers[3].id, amount: 3_200_000_000n, mint: 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM', status: 'Paid' as const, expiresAt: daysAgo(3), paidAt: daysAgo(4), memo: 'Event catering deposit' },
    { customerId: customers[0].id, amount: 4_500_000_000n, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', status: 'Paid' as const, expiresAt: daysAgo(1), paidAt: daysAgo(1), memo: 'Cold brew subscription - February' },
    // 3 open
    { customerId: customers[4].id, amount: 6_700_000_000n, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', status: 'Open' as const, expiresAt: daysFromNow(14), paidAt: null, memo: 'Bulk beans order - 50 lbs' },
    { customerId: customers[5].id, amount: 2_100_000_000n, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', status: 'Open' as const, expiresAt: daysFromNow(7), paidAt: null, memo: 'Weekly office delivery' },
    { customerId: customers[1].id, amount: 15_000_000_000n, mint: 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM', status: 'Open' as const, expiresAt: daysFromNow(30), paidAt: null, memo: 'Annual partnership fee' },
    // 1 expired
    { customerId: customers[3].id, amount: 980_000_000n, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', status: 'Expired' as const, expiresAt: daysAgo(15), paidAt: null, memo: 'Sample tasting kit' },
  ]

  const invoices = await Promise.all(
    invoiceData.map((inv, i) =>
      prisma.invoice.create({
        data: {
          id: ulid(),
          onchainId: `inv_${ulid()}`,
          merchantId,
          customerId: inv.customerId,
          amount: inv.amount,
          mint: inv.mint,
          status: inv.status,
          expiresAt: inv.expiresAt,
          paidAt: inv.paidAt,
          memo: inv.memo,
        },
      })
    )
  )
  console.log(`Created ${invoices.length} invoices (5 paid, 3 open, 1 expired)`)

  // --- Subscription Plan ---
  const planId = ulid()
  const plan = await prisma.subscriptionPlan.create({
    data: {
      id: planId,
      onchainId: `plan_${ulid()}`,
      merchantId,
      label: 'Pro',
      description: 'Pro plan with unlimited access',
      amount: 29_000_000n, // 29 USDC
      mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      intervalSeconds: 2_592_000, // 30 days
      active: true,
    },
  })
  console.log(`Created plan: ${plan.label} ($29/mo)`)

  // --- Subscriptions ---
  const subscriptions = await Promise.all(
    [customers[0], customers[2], customers[4]].map((customer) =>
      prisma.subscription.create({
        data: {
          id: ulid(),
          onchainId: `sub_${ulid()}`,
          planId,
          customerId: customer.id,
          status: 'Active',
          currentPeriodStart: daysAgo(5),
          currentPeriodEnd: daysFromNow(25),
        },
      })
    )
  )
  console.log(`Created ${subscriptions.length} active subscriptions`)

  console.log('\nSeed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
