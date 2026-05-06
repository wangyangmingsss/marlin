'use client'

import Link from 'next/link'
import { Waves, ArrowRight, Check, HelpCircle } from 'lucide-react'

/* ───────────────── plan data ───────────────── */

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    priceNote: 'No monthly fee',
    volume: 'First $10k/mo',
    fee: '0.5% transaction fee',
    features: [
      '1,000 webhooks / month',
      'Invoicing & checkout links',
      'USDC, PYUSD, USDG support',
      'Discord community support',
    ],
    cta: 'Get started',
    href: '/connect',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$99',
    priceNote: '/month',
    volume: 'Up to $100k/mo',
    fee: '0.4% transaction fee',
    features: [
      '100,000 webhooks / month',
      'Subscriptions & recurring billing',
      'Custom branding on checkout',
      'Email support (24h SLA)',
    ],
    cta: 'Get started',
    href: '/connect',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    priceNote: 'Contact us',
    volume: 'Unlimited volume',
    fee: 'Custom transaction fee',
    features: [
      'Unlimited webhooks',
      'Multi-wallet treasury',
      'Dedicated account manager',
      'Dedicated Slack / Telegram support',
    ],
    cta: 'Contact sales',
    href: 'mailto:sales@marlin.dev',
    highlighted: false,
  },
] as const

/* ───────────────── FAQ data ───────────────── */

const faqs = [
  {
    q: 'What stablecoins do you support?',
    a: 'Marlin supports USDC, PYUSD, and USDG on Solana. Customers can pay in any supported stablecoin and you receive funds in your preferred settlement mint.',
  },
  {
    q: 'How are transaction fees charged?',
    a: 'Fees are deducted automatically from each payment before settlement. There are no hidden charges or monthly minimums on the Starter plan.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. You can upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle.',
  },
  {
    q: 'Is there a commitment or contract?',
    a: 'No. The Starter and Growth plans are month-to-month with no lock-in. Enterprise contracts are negotiated individually.',
  },
]

/* ───────────────── component ───────────────── */

export default function PricingPage() {
  return (
    <div className="relative">
      {/* NAV */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Waves className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">Marlin</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/connect" className="btn-primary">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative flex flex-col items-center px-6 pt-32 pb-16 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,102,255,0.15),transparent_70%)]" />
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Simple, transparent{' '}
          <span className="gradient-text">pricing</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Start free, scale as you grow. No hidden fees, no surprises.
        </p>
      </section>

      {/* PRICING CARDS */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card relative flex flex-col p-8 transition-colors ${
                plan.highlighted
                  ? 'border-primary/60 ring-1 ring-primary/30'
                  : 'hover:border-primary/30'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.priceNote}</span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{plan.volume}</p>
              <p className="text-sm text-muted-foreground">{plan.fee}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} w-full justify-center py-2.5`}
              >
                {plan.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Everything you need to know about Marlin pricing.
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass-card p-6 space-y-2">
                <h4 className="flex items-center gap-2 font-medium">
                  <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-sm text-muted-foreground pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12 px-6">
        <div className="mx-auto max-w-6xl flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-primary" />
            <span className="font-semibold">Marlin</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built on Solana. Powered by stablecoins.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
