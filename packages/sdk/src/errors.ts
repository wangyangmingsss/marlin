export class MarlinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarlinError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MarlinAPIError extends MarlinError {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown> | null;

  constructor(opts: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, unknown> | null;
  }) {
    super(opts.message);
    this.name = "MarlinAPIError";
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.details = opts.details ?? null;
  }
}

export type WebhookErrorCode =
  | "malformed_signature"
  | "expired_signature"
  | "future_signature"
  | "invalid_signature"
  | "invalid_payload";

export class MarlinWebhookVerificationError extends MarlinError {
  public readonly code: WebhookErrorCode;

  constructor(message: string, code: WebhookErrorCode = "invalid_signature") {
    super(message);
    this.name = "MarlinWebhookVerificationError";
    this.code = code;
  }
}
