// --- Pagination ---

export interface PaginatedList<T> {
  data: T[];
  has_more: boolean;
  cursor: string | null;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

// --- Rate Limit ---

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
}

// --- Invoice ---

export type InvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "void"
  | "uncollectible"
  | "processing";

export interface Invoice {
  id: string;
  object: "invoice";
  customerId: string;
  subscriptionId: string | null;
  status: InvoiceStatus;
  currency: string;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  description: string | null;
  memo: string | null;
  dueDate: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  lineItems: InvoiceLineItem[];
  metadata: Record<string, string>;
  paymentUrl: string | null;
  transactionSignature: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  currency?: string;
  dueDate?: string;
  description?: string;
  memo?: string;
  lineItems: CreateInvoiceLineItem[];
  metadata?: Record<string, string>;
  autoSend?: boolean;
}

export interface CreateInvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
}

export interface ListInvoicesOptions extends PaginationOptions {
  customerId?: string;
  subscriptionId?: string;
  status?: InvoiceStatus;
}

// --- Plan ---

export type PlanInterval = "day" | "week" | "month" | "year";

export interface SubscriptionPlan {
  id: string;
  object: "plan";
  name: string;
  description: string | null;
  currency: string;
  amount: number;
  interval: PlanInterval;
  intervalCount: number;
  trialPeriodDays: number | null;
  active: boolean;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  currency?: string;
  amount: number;
  interval: PlanInterval;
  intervalCount?: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, string>;
}

export interface ListPlansOptions extends PaginationOptions {
  active?: boolean;
}

// --- Subscription ---

export type SubscriptionStatus =
  | "active"
  | "paused"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete";

export interface Subscription {
  id: string;
  object: "subscription";
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  pausedAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ListSubscriptionsOptions extends PaginationOptions {
  customerId?: string;
  planId?: string;
  status?: SubscriptionStatus;
}

// --- Customer ---

export interface Customer {
  id: string;
  object: "customer";
  email: string;
  name: string | null;
  walletAddress: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  email: string;
  name?: string;
  walletAddress?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  walletAddress?: string;
  metadata?: Record<string, string>;
}

export interface ListCustomersOptions extends PaginationOptions {
  email?: string;
}

// --- Webhook ---

export type WebhookEventType =
  | "invoice.created"
  | "invoice.paid"
  | "invoice.voided"
  | "invoice.overdue"
  | "subscription.created"
  | "subscription.activated"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.canceled"
  | "subscription.past_due"
  | "customer.created"
  | "customer.updated"
  | "payment.received"
  | "payment.confirmed";

export interface WebhookEvent<T = unknown> {
  id: string;
  object: "event";
  type: WebhookEventType;
  data: T;
  createdAt: string;
}

// --- Client Config ---

export interface MarlinConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
