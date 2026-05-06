export { Marlin } from "./client";
export { verifyWebhook } from "./webhooks/verify";
export { MarlinError, MarlinAPIError, MarlinWebhookVerificationError } from "./errors";

// Confidential invoices - also available via '@marlinfi/sdk/confidential' subpath
export * as confidential from "./confidential";

export type {
  MarlinConfig,
  PaginatedList,
  PaginationOptions,
  RateLimit,
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  CreateInvoiceInput,
  CreateInvoiceLineItem,
  ListInvoicesOptions,
  SubscriptionPlan,
  PlanInterval,
  CreatePlanInput,
  UpdatePlanInput,
  ListPlansOptions,
  Subscription,
  SubscriptionStatus,
  ListSubscriptionsOptions,
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersOptions,
  WebhookEvent,
  WebhookEventType,
} from "./types";

export type { VerifyWebhookOptions } from "./webhooks/verify";
