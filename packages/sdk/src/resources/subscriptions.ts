import type { Marlin } from "../client";
import type {
  Subscription,
  ListSubscriptionsOptions,
  PaginatedList,
} from "../types";

export class SubscriptionResource {
  constructor(private readonly client: Marlin) {}

  async list(opts?: ListSubscriptionsOptions): Promise<PaginatedList<Subscription>> {
    return this.client._request<PaginatedList<Subscription>>(
      "GET",
      "/api/subscriptions",
      undefined,
      opts as Record<string, string | number | boolean | undefined>,
    );
  }

  async retrieve(id: string): Promise<Subscription> {
    return this.client._request<Subscription>(
      "GET",
      `/api/subscriptions/${encodeURIComponent(id)}`,
    );
  }

  async pause(id: string): Promise<Subscription> {
    return this.client._request<Subscription>(
      "POST",
      `/api/subscriptions/${encodeURIComponent(id)}/pause`,
    );
  }

  async resume(id: string): Promise<Subscription> {
    return this.client._request<Subscription>(
      "POST",
      `/api/subscriptions/${encodeURIComponent(id)}/resume`,
    );
  }

  async cancel(id: string): Promise<Subscription> {
    return this.client._request<Subscription>(
      "POST",
      `/api/subscriptions/${encodeURIComponent(id)}/cancel`,
    );
  }
}
