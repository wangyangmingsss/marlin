import type { MarlinEvent } from "../event-parser.js";
import { handleInvoicePaid } from "./invoice-paid.js";
import { handleInvoiceVoided } from "./invoice-voided.js";
import { handleSubscriptionCreated } from "./subscription-created.js";
import { handleSubscriptionCharged } from "./subscription-charged.js";
import { handleSubscriptionFailed } from "./subscription-failed.js";
import { handleSubscriptionStatusChanged } from "./subscription-status.js";
import { logger } from "../logger.js";

/**
 * Dispatch a parsed Marlin event to the appropriate handler.
 */
export async function dispatchEvent(
  event: MarlinEvent,
  txSignature: string,
): Promise<void> {
  switch (event.name) {
    case "InvoicePaid":
      return handleInvoicePaid(event, txSignature);
    case "InvoiceVoided":
      return handleInvoiceVoided(event, txSignature);
    case "SubscriptionCreated":
      return handleSubscriptionCreated(event, txSignature);
    case "SubscriptionCharged":
      return handleSubscriptionCharged(event, txSignature);
    case "SubscriptionFailed":
      return handleSubscriptionFailed(event, txSignature);
    case "SubscriptionStatusChanged":
      return handleSubscriptionStatusChanged(event, txSignature);
    default: {
      const _exhaustive: never = event;
      logger.warn({ eventName: (event as any).name }, "Unhandled event type");
    }
  }
}
