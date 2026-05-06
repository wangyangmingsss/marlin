import { createHmac, timingSafeEqual } from "node:crypto";
import { MarlinWebhookVerificationError } from "../errors";
import type { WebhookEvent } from "../types";

export interface VerifyWebhookOptions {
  /** Raw request body as a string. */
  payload: string;
  /** Value of the `marlin-signature` header. */
  signature: string;
  /** Webhook signing secret from the Marlin dashboard. */
  secret: string;
  /** Maximum age of the webhook event in seconds. Defaults to 300 (5 minutes). */
  tolerance?: number;
}

/**
 * Verify and parse a Marlin webhook event.
 *
 * The signature header has the format: `t=<unix_timestamp>,v1=<hmac_hex>`
 *
 * Verification steps:
 * 1. Parse the timestamp and HMAC from the header.
 * 2. Reject if the timestamp is outside the tolerance window.
 * 3. Compute expected HMAC: `HMAC-SHA256(secret, "<timestamp>.<payload>")`.
 * 4. Compare using timing-safe equality.
 * 5. Return the parsed event payload.
 */
export function verifyWebhook(opts: VerifyWebhookOptions): WebhookEvent {
  const { payload, signature, secret, tolerance = 300 } = opts;

  if (!payload) {
    throw new MarlinWebhookVerificationError(
      "Webhook payload is empty.",
      "invalid_payload",
    );
  }

  if (!signature) {
    throw new MarlinWebhookVerificationError(
      "Webhook signature header is missing.",
      "malformed_signature",
    );
  }

  if (!secret) {
    throw new MarlinWebhookVerificationError(
      "Webhook secret is required.",
      "malformed_signature",
    );
  }

  // Parse signature header: t=<ts>,v1=<hmac>
  const parts = signature.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const hmacPart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !hmacPart) {
    throw new MarlinWebhookVerificationError(
      "Invalid signature header format. Expected `t=<timestamp>,v1=<hmac>`.",
      "malformed_signature",
    );
  }

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const receivedHmac = hmacPart.slice(3);

  if (isNaN(timestamp)) {
    throw new MarlinWebhookVerificationError(
      "Invalid timestamp in signature header.",
      "malformed_signature",
    );
  }

  // Check timestamp tolerance — separate past (expired) from future
  const now = Math.floor(Date.now() / 1000);
  const ageSeconds = now - timestamp;

  if (ageSeconds > tolerance) {
    throw new MarlinWebhookVerificationError(
      `Webhook timestamp is too old. Event is ${ageSeconds}s old, tolerance is ${tolerance}s.`,
      "expired_signature",
    );
  }

  if (ageSeconds < -tolerance) {
    throw new MarlinWebhookVerificationError(
      `Webhook timestamp is in the future by ${Math.abs(ageSeconds)}s, tolerance is ${tolerance}s.`,
      "future_signature",
    );
  }

  // Compute expected HMAC
  const signedContent = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret)
    .update(signedContent)
    .digest();

  // Decode provided signature from hex
  const actual = Buffer.from(receivedHmac, "hex");

  // CRITICAL: timing-safe comparison
  // Length check FIRST to avoid timingSafeEqual throwing on length mismatch
  if (expected.length !== actual.length) {
    throw new MarlinWebhookVerificationError(
      "Webhook signature verification failed. The signature does not match the payload.",
      "invalid_signature",
    );
  }

  if (!timingSafeEqual(expected, actual)) {
    throw new MarlinWebhookVerificationError(
      "Webhook signature verification failed. The signature does not match the payload.",
      "invalid_signature",
    );
  }

  // Parse and return the event
  try {
    return JSON.parse(payload) as WebhookEvent;
  } catch {
    throw new MarlinWebhookVerificationError(
      "Failed to parse webhook payload as JSON.",
      "invalid_payload",
    );
  }
}
