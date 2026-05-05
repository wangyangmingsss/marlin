import { BorshCoder, EventParser as AnchorEventParser } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { logger } from "./logger.js";

// ── Event type definitions ──────────────────────────────────────────

export interface InvoicePaidEvent {
  name: "InvoicePaid";
  data: {
    invoice: PublicKey;
    merchant: PublicKey;
    payer: PublicKey;
    mint: PublicKey;
    amount: bigint;
  };
}

export interface InvoiceVoidedEvent {
  name: "InvoiceVoided";
  data: {
    invoice: PublicKey;
    merchant: PublicKey;
  };
}

export interface SubscriptionCreatedEvent {
  name: "SubscriptionCreated";
  data: {
    subscription: PublicKey;
    plan: PublicKey;
    customer: PublicKey;
    mint: PublicKey;
    amount: bigint;
    intervalSeconds: number;
  };
}

export interface SubscriptionChargedEvent {
  name: "SubscriptionCharged";
  data: {
    subscription: PublicKey;
    plan: PublicKey;
    customer: PublicKey;
    mint: PublicKey;
    amount: bigint;
    periodStart: bigint;
    periodEnd: bigint;
  };
}

export interface SubscriptionFailedEvent {
  name: "SubscriptionFailed";
  data: {
    subscription: PublicKey;
    plan: PublicKey;
    customer: PublicKey;
  };
}

export interface SubscriptionStatusChangedEvent {
  name: "SubscriptionStatusChanged";
  data: {
    subscription: PublicKey;
    fromStatus: number;
    toStatus: number;
  };
}

export type MarlinEvent =
  | InvoicePaidEvent
  | InvoiceVoidedEvent
  | SubscriptionCreatedEvent
  | SubscriptionChargedEvent
  | SubscriptionFailedEvent
  | SubscriptionStatusChangedEvent;

// ── Minimal IDL for BorshCoder ──────────────────────────────────────
// We only need the events portion of the IDL to decode event data.
// If the full IDL is available at runtime you can swap this out.

const MARLIN_IDL: any = {
  version: "0.1.0",
  name: "marlin",
  instructions: [],
  accounts: [],
  events: [
    {
      name: "InvoicePaid",
      fields: [
        { name: "invoice", type: "publicKey" },
        { name: "merchant", type: "publicKey" },
        { name: "payer", type: "publicKey" },
        { name: "mint", type: "publicKey" },
        { name: "amount", type: "u64" },
      ],
    },
    {
      name: "InvoiceVoided",
      fields: [
        { name: "invoice", type: "publicKey" },
        { name: "merchant", type: "publicKey" },
      ],
    },
    {
      name: "SubscriptionCreated",
      fields: [
        { name: "subscription", type: "publicKey" },
        { name: "plan", type: "publicKey" },
        { name: "customer", type: "publicKey" },
        { name: "mint", type: "publicKey" },
        { name: "amount", type: "u64" },
        { name: "intervalSeconds", type: "u32" },
      ],
    },
    {
      name: "SubscriptionCharged",
      fields: [
        { name: "subscription", type: "publicKey" },
        { name: "plan", type: "publicKey" },
        { name: "customer", type: "publicKey" },
        { name: "mint", type: "publicKey" },
        { name: "amount", type: "u64" },
        { name: "periodStart", type: "i64" },
        { name: "periodEnd", type: "i64" },
      ],
    },
    {
      name: "SubscriptionFailed",
      fields: [
        { name: "subscription", type: "publicKey" },
        { name: "plan", type: "publicKey" },
        { name: "customer", type: "publicKey" },
      ],
    },
    {
      name: "SubscriptionStatusChanged",
      fields: [
        { name: "subscription", type: "publicKey" },
        { name: "fromStatus", type: "u8" },
        { name: "toStatus", type: "u8" },
      ],
    },
  ],
};

const KNOWN_EVENT_NAMES = new Set<string>([
  "InvoicePaid",
  "InvoiceVoided",
  "SubscriptionCreated",
  "SubscriptionCharged",
  "SubscriptionFailed",
  "SubscriptionStatusChanged",
]);

/**
 * Parse Marlin Anchor events from a transaction's program log messages.
 *
 * Anchor emits events as base64-encoded borsh data prefixed with an 8-byte
 * discriminator inside `Program data: <base64>` log entries.
 */
export function parseEventsFromLogs(
  logs: string[],
  programId: string,
): MarlinEvent[] {
  try {
    const coder = new BorshCoder(MARLIN_IDL);
    const parser = new AnchorEventParser(new PublicKey(programId), coder);
    const events: MarlinEvent[] = [];

    const generator = parser.parseLogs(logs);
    for (const event of generator) {
      if (KNOWN_EVENT_NAMES.has(event.name)) {
        events.push({ name: event.name, data: event.data } as MarlinEvent);
      }
    }

    return events;
  } catch (err) {
    logger.error({ err }, "Failed to parse events from transaction logs");
    return [];
  }
}
