import { prisma } from '@marlin/db'
import { ulid } from 'ulid'

async function main() {
  console.log('Seeding database...')

  // --- Merchant ---
  const merchantId = ulid()
  const merchant = await prisma.merchant.create({
    data: {
      id: merchantId,
      name: 'Acme Coffee Shop',
      email: 'owner@acmecoffee.com',
      walletAddress: '7XSY4Mq5r9Gf8Kp2VbNcAeDhWJ6nRtU3ZxPmLs1wQoB',
    },
  })
  console.log(`Created merchant: ${merchant.name}`)

  // --- Customers ---
  const customerData = [
    { name: 'Alice Johnson', email: 'alice@example.com', walletAddress: '3Fk8rPQ7vXm2Yz9LsNdWcJeH4gTpU6aBx1Ro5iKwMnE' },
    { name: 'Bob Martinez', email: 'bob.martinez@gmail.com', walletAddress: '9Hn4tLm6jKp3Qr8WxCvBdAeS5fG7iYoU2Zl1RwXaNbE' },
    { name: 'Carol Wei', email: 'carol.wei@company.co', walletAddress: 'BpR7mK3nF9xL2Qe4JcWvY6sHdA8tG1iZoU5wXaN0bEf' },
    { name: 'David Okafor', email: 'david.ok@protonmail.com', walletAddress: '5Gn2rLk8mP4Qx9WtCvBjAeH7fS3iYoU6Zl1RwXaN0bD' },
    { name: 'Elena Petrov', email: 'elena.p@startup.io', walletAddress: 'Ht6mK3nF9xL2Qe4JcWvY8sRdA7tG1iZoU5wXaN0bEfP' },
    { name: 'Frank Tanaka', email: 'frank.tanaka@email.jp', walletAddress: '2Jk9pLm6nR4Qx8WtCvBdAeH5fS3iYoU7Zl1GwXaN0bE' },
  ]

  const customers = await Promise.all(
    customerData.map((c) =>
      prisma.customer.create({
        data: {
          id: ulid(),
          merchantId,
          name: c.name,
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
    { customerId: customers[0].id, amount: 4500, currency: 'USDC', status: 'paid', dueDate: daysAgo(10), paidAt: daysAgo(12), memo: 'Cold brew subscription - January' },
    { customerId: customers[1].id, amount: 1250, currency: 'USDC', status: 'paid', dueDate: daysAgo(8), paidAt: daysAgo(9), memo: 'Catering order #1042' },
    { customerId: customers[2].id, amount: 8900, currency: 'USDC', status: 'paid', dueDate: daysAgo(5), paidAt: daysAgo(6), memo: 'Office coffee supply Q1' },
    { customerId: customers[3].id, amount: 3200, currency: 'USDT', status: 'paid', dueDate: daysAgo(3), paidAt: daysAgo(4), memo: 'Event catering deposit' },
    { customerId: customers[0].id, amount: 4500, currency: 'USDC', status: 'paid', dueDate: daysAgo(1), paidAt: daysAgo(1), memo: 'Cold brew subscription - February' },
    // 3 open
    { customerId: customers[4].id, amount: 6700, currency: 'USDC', status: 'open', dueDate: daysFromNow(14), paidAt: null, memo: 'Bulk beans order - 50 lbs' },
    { customerId: customers[5].id, amount: 2100, currency: 'USDC', status: 'open', dueDate: daysFromNow(7), paidAt: null, memo: 'Weekly office delivery' },
    { customerId: customers[1].id, amount: 15000, currency: 'USDT', status: 'open', dueDate: daysFromNow(30), paidAt: null, memo: 'Annual partnership fee' },
    // 1 expired
    { customerId: customers[3].id, amount: 980, currency: 'USDC', status: 'expired', dueDate: daysAgo(15), paidAt: null, memo: 'Sample tasting kit' },
  ]

  const invoices = await Promise.all(
    invoiceData.map((inv) =>
      prisma.invoice.create({
        data: {
          id: ulid(),
          merchantId,
          customerId: inv.customerId,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
          memo: inv.memo,
        },
      })
    )
  )
  console.log(`Created ${invoices.length} invoices (5 paid, 3 open, 1 expired)`)

  // --- Subscription Plan ---
  const planId = ulid()
  const plan = await prisma.plan.create({
    data: {
      id: planId,
      merchantId,
      name: 'Pro',
      amount: 2900,
      currency: 'USDC',
      interval: 'month',
    },
  })
  console.log(`Created plan: ${plan.name} ($29/mo)`)

  // --- Subscriptions ---
  const subscriptions = await Promise.all(
    [customers[0], customers[2], customers[4]].map((customer) =>
      prisma.subscription.create({
        data: {
          id: ulid(),
          merchantId,
          customerId: customer.id,
          planId,
          status: 'active',
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
