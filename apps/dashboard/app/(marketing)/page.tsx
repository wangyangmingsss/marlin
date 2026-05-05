import Link from 'next/link'
import { Waves, FileText, RefreshCw, Code2, ArrowRight, Wallet, Send, BarChart3 } from 'lucide-react'

/* Placeholder -- filled in sections via Edit */
export default function LandingPage() {
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
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,102,255,0.15),transparent_70%)]" />
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Live on Solana Devnet
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            The financial OS for{' '}
            <span className="gradient-text">stablecoin businesses</span>{' '}
            on Solana
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Invoice customers, manage recurring subscriptions, and build with our developer API.
            Accept <span className="text-foreground font-medium">USDC</span>,{' '}
            <span className="text-foreground font-medium">PYUSD</span>, and{' '}
            <span className="text-foreground font-medium">USDG</span> on the fastest chain.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/connect" className="btn-primary px-6 py-3 text-base">
              Connect Wallet to Start
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a href="#features" className="btn-secondary px-6 py-3 text-base">
              Read the docs
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Everything you need for stablecoin billing
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete platform for creating invoices, managing subscriptions, and integrating stablecoin payments into your workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                icon: FileText,
                title: 'Invoicing',
                desc: 'Create on-chain invoices with hosted checkout pages. Customers pay in their preferred stablecoin with a single click.',
              },
              {
                icon: RefreshCw,
                title: 'Subscriptions',
                desc: 'Automated recurring billing with on-chain subscription plans. Handle upgrades, downgrades, and cancellations.',
              },
              {
                icon: Code2,
                title: 'Developer API',
                desc: 'RESTful API with webhook support. Build custom integrations, automate billing workflows, and embed payments.',
              },
            ].map((feature) => (
              <div key={feature.title} className="glass-card p-8 space-y-4 hover:border-primary/30 transition-colors">
                <div className="rounded-lg bg-primary/10 p-3 w-fit">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
            <p className="mt-4 text-muted-foreground text-lg">Get started in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                icon: Wallet,
                title: 'Connect your wallet',
                desc: 'Sign in with your Solana wallet. No passwords, no emails. Your keys, your account.',
              },
              {
                step: '02',
                icon: Send,
                title: 'Create & send',
                desc: 'Create invoices or subscription plans. Share checkout links with your customers.',
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'Get paid & grow',
                desc: 'Receive stablecoin payments directly to your wallet. Track everything in your dashboard.',
              },
            ].map((item) => (
              <div key={item.step} className="relative space-y-4 text-center">
                <span className="text-6xl font-bold text-primary/10">{item.step}</span>
                <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto -mt-6 relative">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to get started?</h2>
          <p className="text-lg text-muted-foreground">
            Join the growing number of businesses using Marlin for stablecoin billing on Solana.
          </p>
          <Link href="/connect" className="btn-primary px-8 py-3 text-base inline-flex">
            Connect Wallet
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
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
