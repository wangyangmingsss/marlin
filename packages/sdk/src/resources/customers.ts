import type { Marlin } from "../client";
import type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersOptions,
  PaginatedList,
} from "../types";

export class CustomerResource {
  constructor(private readonly client: Marlin) {}

  async create(input: CreateCustomerInput): Promise<Customer> {
    return this.client._request<Customer>("POST", "/api/customers", input);
  }

  async retrieve(id: string): Promise<Customer> {
    return this.client._request<Customer>(
      "GET",
      `/api/customers/${encodeURIComponent(id)}`,
    );
  }

  async list(opts?: ListCustomersOptions): Promise<PaginatedList<Customer>> {
    return this.client._request<PaginatedList<Customer>>(
      "GET",
      "/api/customers",
      undefined,
      opts as Record<string, string | number | boolean | undefined>,
    );
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    return this.client._request<Customer>(
      "PATCH",
      `/api/customers/${encodeURIComponent(id)}`,
      input,
    );
  }
}
