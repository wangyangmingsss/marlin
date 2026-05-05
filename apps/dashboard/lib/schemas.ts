import { z } from 'zod'

// ─── Auth ───────────────────────────────────────────────────────────

export const nonceQuerySchema = z.object({
  address: z.string().min(32).max(44),
})

export const loginSchema = z.object({
  address: z.string().min(32).max(44),
  signature: z.string(),
  nonce: z.string(),
})

// ─── Merchant ───────────────────────────────────────────────────────

export const createMerchantSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  label: z.string().min(1).max(100).optional(),
})

export const updateMerchantSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  webhookUrl: z.string().url().optional().nullable(),
})

// ─── Invoice ────────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1),
  unitPrice: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid price format'),
})

export const createInvoiceSchema = z.object({
  customerWallet: z.string().min(32).max(44),
  customerEmail: z.string().email().optional(),
  customerLabel: z.string().max(100).optional(),
  mint: z.enum(['USDC', 'PYUSD', 'USDG']),
  lineItems: z.array(lineItemSchema).min(1).max(50),
  taxBps: z.number().int().min(0).max(10000).default(0),
  memo: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
})

// ─── Plan ───────────────────────────────────────────────────────────

export const createPlanSchema = z.object({
  mint: z.enum(['USDC', 'PYUSD', 'USDG']),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format'),
  intervalSeconds: z.number().int().min(86400),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const updatePlanSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
})

// ─── Subscription ───────────────────────────────────────────────────

export const createSubscriptionSchema = z.object({
  planId: z.string(),
  customerWallet: z.string().min(32).max(44),
})

// ─── Customers ──────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  email: z.string().email().optional(),
  label: z.string().max(100).optional(),
})

export const updateCustomerSchema = z.object({
  email: z.string().email().optional().nullable(),
  label: z.string().max(100).optional().nullable(),
})

// ─── API Keys ───────────────────────────────────────────────────────

export const createApiKeySchema = z.object({
  label: z.string().min(1).max(100).optional(),
})

// ─── Webhook ────────────────────────────────────────────────────────

export const updateWebhookSchema = z.object({
  webhookUrl: z.string().url().nullable(),
})

// ─── Public payment ─────────────────────────────────────────────────

export const buildPaymentTxSchema = z.object({
  payerWallet: z.string().min(32).max(44),
})

export const buildSubscribeTxSchema = z.object({
  customerWallet: z.string().min(32).max(44),
})
