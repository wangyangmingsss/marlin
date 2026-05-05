import { prisma } from "@marlin/db";
import type { InvoicePaidEvent } from "../event-parser.js";
import { RetryableError } from "../errors.js";
import { enqueueWebhook } from "../webhook-queue.js";
import { logger } from "../logger.js";

export async function handleInvoicePaid(
  event: InvoicePaidEvent,
  txSignature: string,
): Promise<void> {
  const log = logger.child({ handler: "InvoicePaid", txSignature });
  const invoicePda = event.data.invoice.toBase58();
  const payerWallet = event.data.payer.toBase58();

  // Find the invoice by its on-chain PDA
  const invoice = await prisma.invoice.findUnique({
    where: { onchainId: invoicePda },
    include: { merchant: true },
  });

  if (!invoice) {
    log.warn({ invoicePda }, "Invoice not found in DB, will retry");
    throw new RetryableError(`Invoice not found for PDA ${invoicePda}`);
  }

  // Idempotency: if already paid, skip
  if (invoice.status === "Paid") {
    log.info({ invoiceId: invoice.id }, "Invoice already paid, skipping");
    return;
  }

  // Upsert customer by payer wallet + merchant
  const customer = await prisma.customer.upsert({
    where: {
      walletAddress_merchantId: {
        walletAddress: payerWallet,
        merchantId: invoice.merchantId,
      },
    },
    update: {},
    create: {
      walletAddress: payerWallet,
      merchantId: invoice.merchantId,
    },
  });

  // Update invoice to PAID
  const now = new Date();
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "Paid",
      paidAt: now,
      paidTxSignature: txSignature,
      customerId: customer.id,
    },
  });

  log.info({ invoiceId: invoice.id, customerId: customer.id }, "Invoice marked as paid");

  // Enqueue webhook delivery
  if (invoice.merchant.webhookUrl) {
    await enqueueWebhook(invoice.merchantId, "invoice.paid", {
      invoiceId: invoice.id,
      onchainId: invoicePda,
      payer: payerWallet,
      mint: event.data.mint.toBase58(),
      amount: event.data.amount.toString(),
      txSignature,
      paidAt: now.toISOString(),
    });
  }
}
