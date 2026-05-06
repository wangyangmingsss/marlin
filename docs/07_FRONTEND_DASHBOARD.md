# Frontend Dashboard

## Overview

The merchant dashboard is a Next.js 14 App Router application at `apps/dashboard/`. It provides a full management interface for invoices, subscriptions, customers, and settings.

## Page Structure

### Marketing (`app/(marketing)/`)
| Page       | Purpose                                     |
|------------|---------------------------------------------|
| `/`        | Landing page with product overview and CTA  |

### Auth (`app/(auth)/`)
| Page            | Purpose                              |
|-----------------|--------------------------------------|
| `/connect`      | Connect Solana wallet (SIWS flow)    |
| `/onboarding`   | New merchant setup wizard            |

### Dashboard (`app/(dashboard)/`)
| Page                | Purpose                                              |
|---------------------|------------------------------------------------------|
| `/dashboard`        | Overview with key metrics and recent activity        |
| `/invoices`         | List, search, filter invoices                        |
| `/invoices/new`     | Create a new invoice                                 |
| `/invoices/[id]`    | Invoice detail view with status and payment history  |
| `/subscriptions`    | List active subscription plans and subscribers       |
| `/plans`            | Manage subscription plans                            |
| `/plans/new`        | Create a new subscription plan                       |
| `/customers`        | Customer directory                                   |
| `/customers/[id]`   | Customer detail with payment history                 |
| `/settings`         | Merchant settings, API keys, webhook config          |

## Tech Stack

- Next.js 14 (App Router) with server components
- Tailwind CSS + shadcn/ui for design system
- Wallet adapter for Solana wallet connection
- JWT-based session management
