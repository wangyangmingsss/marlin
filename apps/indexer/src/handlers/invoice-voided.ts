import { prisma } from "@marlin/db";
import type { InvoiceVoidedEvent } from "../event-parser.js";
import { RetryableError } from "../errors.js";
import { enqueueWebhook } from "../webhook-queue.js";
import { logger } from "../logger.js";

export async function handleInvoiceVoided(
  event: InvoiceVoidedEvent,
  txSignature: string,
): Promise<void> {
  const log = logger.child({ handler: "InvoiceVoided", txSignature });
  const invoicePda = event.data.invoice.toBase58();

  const invoice = await prisma.invoice.findUnique({
    where: { onchainId: invoicePda },
    include: { merchant: true },
  });

  if (!invoice) {
    log.warn({ invoicePda }, "Invoice not found in DB, will retry");
    throw new RetryableError(`Invoice not found for PDA ${invoicePda}`);
  }

  // Idempotency
  if (invoice.status === "Cancelled") {
    log.info({ invoiceId: invoice.id }, "Invoice already voided, skipping");
    return;
  }

  const now = new Date();
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "Cancelled",
      updatedAt: now,
    },
  });

  log.info({ invoiceId: invoice.id }, "Invoice voided");

  if (invoice.merchant.webhookUrl) {
    await enqueueWebhook(invoice.merchantId, "invoice.voided", {
      invoiceId: invoice.id,
      onchainId: invoicePda,
      txSignature,
      voidedAt: now.toISOString(),
    });
  }
}
