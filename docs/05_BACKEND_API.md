# Backend API

## Overview

REST API hosted as Next.js API routes inside `apps/dashboard/app/api/`. Follows Stripe conventions for naming, pagination, and error handling. Authentication via SIWS (Sign-In With Solana) + JWT.

## Endpoints

### Auth
| Method | Path                | Description                    |
|--------|---------------------|--------------------------------|
| GET    | `/api/auth/nonce`   | Get SIWS message to sign       |
| POST   | `/api/auth/login`   | Verify signature, issue JWT    |
| POST   | `/api/auth/logout`  | Clear session                  |
| GET    | `/api/auth/me`      | Get current merchant profile   |

### Invoices
| Method | Path                      | Description                          |
|--------|---------------------------|--------------------------------------|
| POST   | `/api/invoices`           | Create invoice (returns unsigned tx) |
| GET    | `/api/invoices`           | List invoices with filters           |
| GET    | `/api/invoices/:id`       | Get single invoice                   |
| POST   | `/api/invoices/:id/void`  | Void an unpaid invoice               |

### Subscription Plans
| Method | Path               | Description       |
|--------|--------------------|--------------------|
| POST   | `/api/plans`       | Create plan        |
| GET    | `/api/plans`       | List plans         |
| PATCH  | `/api/plans/:id`   | Update plan        |

### Subscriptions
| Method | Path                           | Description |
|--------|--------------------------------|-------------|
| GET    | `/api/subscriptions`           | List all    |
| POST   | `/api/subscriptions/:id/pause` | Pause       |
| POST   | `/api/subscriptions/:id/resume`| Resume      |
| POST   | `/api/subscriptions/:id/cancel`| Cancel      |

### Customers
| Method | Path                  | Description      |
|--------|-----------------------|------------------|
| GET    | `/api/customers`      | List customers   |
| POST   | `/api/customers`      | Create customer  |
| PATCH  | `/api/customers/:id`  | Update customer  |

### Public (No Auth Required)
| Method | Path                                      | Description                     |
|--------|-------------------------------------------|---------------------------------|
| GET    | `/api/public/invoice/:token`              | Invoice details for checkout    |
| POST   | `/api/public/invoice/:token/build-payment-tx` | Build payment transaction  |
| GET    | `/api/public/plan/:slug`                  | Plan details for subscription   |

### Settings
| Method     | Path                        | Description             |
|------------|-----------------------------|-------------------------|
| GET/PUT    | `/api/settings/webhook`     | Webhook configuration   |
| GET/POST/DELETE | `/api/settings/api-keys` | API key management     |
