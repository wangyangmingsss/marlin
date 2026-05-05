import type { Marlin } from "../client";
import type {
  Invoice,
  CreateInvoiceInput,
  ListInvoicesOptions,
  PaginatedList,
} from "../types";

export class InvoiceResource {
  constructor(private readonly client: Marlin) {}

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    return this.client._request<Invoice>("POST", "/api/invoices", input);
  }

  async retrieve(id: string): Promise<Invoice> {
    return this.client._request<Invoice>("GET", `/api/invoices/${encodeURIComponent(id)}`);
  }

  async list(opts?: ListInvoicesOptions): Promise<PaginatedList<Invoice>> {
    return this.client._request<PaginatedList<Invoice>>(
      "GET",
      "/api/invoices",
      undefined,
      opts as Record<string, string | number | boolean | undefined>,
    );
  }

  async void(id: string): Promise<Invoice> {
    return this.client._request<Invoice>(
      "POST",
      `/api/invoices/${encodeURIComponent(id)}/void`,
    );
  }

  async send(id: string): Promise<Invoice> {
    return this.client._request<Invoice>(
      "POST",
      `/api/invoices/${encodeURIComponent(id)}/send`,
    );
  }
}
