import { MarlinAPIError } from "./errors";
import { InvoiceResource } from "./resources/invoices";
import { PlanResource } from "./resources/plans";
import { SubscriptionResource } from "./resources/subscriptions";
import { CustomerResource } from "./resources/customers";
import { SDK_VERSION } from "./version";
import type { MarlinConfig, RateLimit } from "./types";

const DEFAULT_BASE_URL = "https://api.marlin.dev";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_STATUS_CODES = new Set([500, 502, 503, 504]);

export class Marlin {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  public readonly invoices: InvoiceResource;
  public readonly plans: PlanResource;
  public readonly subscriptions: SubscriptionResource;
  public readonly customers: CustomerResource;

  /** Most recent rate limit info from the API. */
  public lastRateLimit: RateLimit | null = null;

  constructor(config: MarlinConfig) {
    if (!config.apiKey) {
      throw new Error(
        "Marlin API key is required. Pass it as `apiKey` in the constructor.",
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

    this.invoices = new InvoiceResource(this);
    this.plans = new PlanResource(this);
    this.subscriptions = new SubscriptionResource(this);
    this.customers = new CustomerResource(this);
  }

  /** @internal */
  async _request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `@marlinfi/sdk/${SDK_VERSION}`,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000);
        await sleep(delay);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url.toString(), {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        this.lastRateLimit = parseRateLimitHeaders(response.headers);

        if (response.ok) {
          if (response.status === 204) {
            return undefined as T;
          }
          return (await response.json()) as T;
        }

        const errorBody = await safeParseJSON(response);

        const apiError = new MarlinAPIError({
          message:
            (errorBody?.message as string) ??
            (errorBody?.error as string) ??
            `API request failed with status ${response.status}`,
          code: (errorBody?.code as string) ?? "api_error",
          statusCode: response.status,
          details: (errorBody?.details as Record<string, unknown>) ?? null,
        });

        if (RETRY_STATUS_CODES.has(response.status) && attempt < this.maxRetries) {
          lastError = apiError;
          continue;
        }

        throw apiError;
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof MarlinAPIError) {
          throw err;
        }

        if (err instanceof DOMException && err.name === "AbortError") {
          lastError = new MarlinAPIError({
            message: `Request timed out after ${this.timeout}ms`,
            code: "timeout",
            statusCode: 0,
          });

          if (attempt < this.maxRetries) {
            continue;
          }

          throw lastError;
        }

        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.maxRetries) {
          continue;
        }

        throw lastError;
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }
}

function parseRateLimitHeaders(headers: Headers): RateLimit | null {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");

  if (limit === null || remaining === null || reset === null) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
  };
}

async function safeParseJSON(
  response: Response,
): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
