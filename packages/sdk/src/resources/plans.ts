import type { Marlin } from "../client";
import type {
  SubscriptionPlan,
  CreatePlanInput,
  UpdatePlanInput,
  ListPlansOptions,
  PaginatedList,
} from "../types";

export class PlanResource {
  constructor(private readonly client: Marlin) {}

  async create(input: CreatePlanInput): Promise<SubscriptionPlan> {
    return this.client._request<SubscriptionPlan>("POST", "/api/plans", input);
  }

  async retrieve(id: string): Promise<SubscriptionPlan> {
    return this.client._request<SubscriptionPlan>(
      "GET",
      `/api/plans/${encodeURIComponent(id)}`,
    );
  }

  async list(opts?: ListPlansOptions): Promise<PaginatedList<SubscriptionPlan>> {
    return this.client._request<PaginatedList<SubscriptionPlan>>(
      "GET",
      "/api/plans",
      undefined,
      opts as Record<string, string | number | boolean | undefined>,
    );
  }

  async update(id: string, input: UpdatePlanInput): Promise<SubscriptionPlan> {
    return this.client._request<SubscriptionPlan>(
      "PATCH",
      `/api/plans/${encodeURIComponent(id)}`,
      input,
    );
  }
}
