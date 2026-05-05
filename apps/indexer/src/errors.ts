/**
 * Thrown when an event handler encounters a transient condition
 * (e.g. the invoice hasn't been written to the DB yet) and should
 * be retried after a short delay.
 */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}
