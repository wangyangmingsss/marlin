# Smart Contracts

## Overview

The Marlin Anchor program (`programs/marlin/`) implements 13 instructions covering the full billing lifecycle. All payment instructions enforce a 50 bps (0.5%) protocol fee split at settlement time.

Supported mints: USDC, PYUSD, USDG (mainnet + devnet addresses allowlisted).

## Instructions

| #  | Instruction                        | Description                                                    |
|----|-------------------------------------|----------------------------------------------------------------|
| 1  | `initialize_merchant`              | Create merchant PDA, set default settlement mint               |
| 2  | `update_merchant`                  | Update display name or settlement mint                         |
| 3  | `create_invoice`                   | Create invoice PDA in Open status                              |
| 4  | `pay_invoice`                      | Customer pays; splits 99.5% to merchant, 0.5% protocol fee    |
| 5  | `void_invoice`                     | Merchant voids an unpaid invoice                               |
| 6  | `create_subscription_plan`         | Create a recurring billing plan (amount, period, trial)        |
| 7  | `set_plan_active`                  | Toggle plan active/inactive                                    |
| 8  | `subscribe`                        | Customer subscribes + delegates token authority                |
| 9  | `charge_subscription`              | Permissionless cranking — anyone can trigger due charges        |
| 10 | `pause_subscription`               | Customer or merchant pauses a subscription                     |
| 11 | `resume_subscription`              | Resume subscription from paused/failed state                   |
| 12 | `cancel_subscription`              | Cancel subscription + revoke delegate authority                |
| 13 | `update_subscription_authorization`| Customer increases spending cap on delegation                  |

## Source Layout

```
programs/marlin/src/
├── lib.rs              # Program entrypoint + constants
├── errors.rs           # Custom error codes
├── state/              # Account structs (Merchant, Invoice, Plan, Subscription)
└── instructions/       # One file per instruction handler
```

## Key Design Decisions

- **Non-custodial**: Funds flow directly from customer ATA to merchant ATA at payment time.
- **Permissionless charging**: `charge_subscription` can be called by any signer (cron worker), enabling automated recurring billing.
- **Escrow-free invoices**: No escrow PDA holds funds; payment is atomic transfer on `pay_invoice`.
