/**
 * OpenAPI 3.1 spec generator for the Marlin API.
 * Generates a complete spec documenting all public and authenticated endpoints.
 */

export function generateOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Marlin API',
      version: '1.0.0',
      description:
        'Stripe Billing for stablecoins on Solana. Create invoices, manage subscriptions, and accept crypto payments — all on-chain. Currently live on devnet.',
      contact: {
        name: 'Marlin',
        url: 'https://marlin.fi',
      },
      license: {
        name: 'MIT',
        url: 'https://github.com/marlin-protocol/marlin/blob/main/LICENSE',
      },
    },
    servers: [
      { url: 'https://marlin.fi', description: 'Production (devnet-backed)' },
      { url: 'http://localhost:3000', description: 'Local development' },
    ],
    tags: [
      { name: 'Health', description: 'Service health check' },
      { name: 'Invoices', description: 'Create, list, retrieve, and void invoices' },
      { name: 'Plans', description: 'Subscription plan management' },
      { name: 'Subscriptions', description: 'Active subscription operations' },
      { name: 'Customers', description: 'Customer records' },
      { name: 'Webhooks', description: 'Webhook configuration and delivery' },
      { name: 'Public', description: 'No-auth payment endpoints for payers' },
      { name: 'API Keys', description: 'API key management' },
      { name: 'Confidential Invoices', description: 'Privacy-preserving encrypted invoices' },
    ],
    paths: {
      // --- Health ---
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          operationId: 'getHealth',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
            },
          },
        },
      },
      // --- Invoices ---
      '/api/invoices': {
        get: {
          tags: ['Invoices'],
          summary: 'List invoices',
          operationId: 'listInvoices',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['Open', 'Paid', 'Void', 'Expired'] } },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by onchain ID, memo, customer label, or wallet' },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 }, description: 'Number of items per page' },
            { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Pagination cursor (id of last item from previous page)' },
          ],
          responses: {
            '200': { description: 'List of invoices', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Invoices'],
          summary: 'Create an invoice',
          operationId: 'createInvoice',
          security: [{ bearerAuth: [] }],
          description: 'Creates an invoice and returns an unsigned Solana transaction for the merchant to sign.',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateInvoiceBody' } } } },
          responses: {
            '201': { description: 'Invoice created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateInvoiceResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/invoices/{id}': {
        get: {
          tags: ['Invoices'],
          summary: 'Retrieve an invoice',
          operationId: 'getInvoice',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Invoice details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/invoices/{id}/void': {
        post: {
          tags: ['Invoices'],
          summary: 'Void an invoice',
          operationId: 'voidInvoice',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Invoice voided', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTxResponse' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/invoices/{id}/send': {
        post: {
          tags: ['Invoices'],
          summary: 'Send invoice notification to customer',
          operationId: 'sendInvoice',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Notification sent' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      // --- Plans ---
      '/api/plans': {
        get: {
          tags: ['Plans'],
          summary: 'List subscription plans',
          operationId: 'listPlans',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'List of plans', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Plan' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Plans'],
          summary: 'Create a subscription plan',
          operationId: 'createPlan',
          security: [{ bearerAuth: [] }],
          description: 'Creates a plan and returns an unsigned Solana transaction.',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePlanBody' } } } },
          responses: {
            '201': { description: 'Plan created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePlanResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/plans/{id}': {
        get: {
          tags: ['Plans'],
          summary: 'Retrieve a plan',
          operationId: 'getPlan',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Plan details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Plan' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/plans/{id}/subscriptions': {
        get: {
          tags: ['Plans'],
          summary: 'List subscriptions for a plan',
          operationId: 'listPlanSubscriptions',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Subscriptions for this plan', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subscription' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      // --- Subscriptions --- (see full definition near end of paths with POST)
      '/api/subscriptions/{id}': {
        get: {
          tags: ['Subscriptions'],
          summary: 'Retrieve a subscription',
          operationId: 'getSubscription',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Subscription details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/subscriptions/{id}/pause': {
        post: {
          tags: ['Subscriptions'],
          summary: 'Pause a subscription',
          operationId: 'pauseSubscription',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Subscription paused', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/subscriptions/{id}/resume': {
        post: {
          tags: ['Subscriptions'],
          summary: 'Resume a paused subscription',
          operationId: 'resumeSubscription',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Subscription resumed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/subscriptions/{id}/cancel': {
        post: {
          tags: ['Subscriptions'],
          summary: 'Cancel a subscription',
          operationId: 'cancelSubscription',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Subscription cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/subscriptions/{id}/charges': {
        get: {
          tags: ['Subscriptions'],
          summary: 'List charges for a subscription',
          operationId: 'listSubscriptionCharges',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'List of charges', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Charge' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      // --- Customers ---
      '/api/customers': {
        get: {
          tags: ['Customers'],
          summary: 'List customers',
          operationId: 'listCustomers',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by wallet, label, or email' }],
          responses: {
            '200': { description: 'List of customers', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Customer' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Customers'],
          summary: 'Create or update a customer',
          operationId: 'createCustomer',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCustomerBody' } } } },
          responses: {
            '201': { description: 'Customer created/updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/customers/{id}': {
        get: {
          tags: ['Customers'],
          summary: 'Retrieve a customer',
          operationId: 'getCustomer',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Customer details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      // --- Webhooks ---
      '/api/settings/webhook': {
        get: {
          tags: ['Webhooks'],
          summary: 'Get webhook configuration',
          operationId: 'getWebhook',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Webhook config', content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookConfig' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        put: {
          tags: ['Webhooks'],
          summary: 'Update webhook URL',
          operationId: 'updateWebhook',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateWebhookBody' } } } },
          responses: {
            '200': { description: 'Webhook updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookConfig' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/settings/webhook/rotate': {
        post: {
          tags: ['Webhooks'],
          summary: 'Rotate webhook signing secret',
          operationId: 'rotateWebhookSecret',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'New signing secret', content: { 'application/json': { schema: { type: 'object', properties: { secret: { type: 'string' } } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/settings/webhook/test': {
        post: {
          tags: ['Webhooks'],
          summary: 'Send a test webhook event',
          operationId: 'testWebhook',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Test event sent' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/settings/webhook/deliveries': {
        get: {
          tags: ['Webhooks'],
          summary: 'List recent webhook deliveries',
          operationId: 'listWebhookDeliveries',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Delivery log', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WebhookDelivery' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      // --- API Keys ---
      '/api/settings/api-keys': {
        get: {
          tags: ['API Keys'],
          summary: 'List API keys',
          operationId: 'listApiKeys',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'List of API keys', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ApiKey' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['API Keys'],
          summary: 'Create a new API key',
          operationId: 'createApiKey',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['label'], properties: { label: { type: 'string' } } } } } },
          responses: {
            '201': { description: 'API key created (secret shown only once)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiKeyCreated' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/settings/api-keys/{id}': {
        delete: {
          tags: ['API Keys'],
          summary: 'Revoke an API key',
          operationId: 'revokeApiKey',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Key revoked' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      // --- Public (no auth) ---
      '/api/public/invoice/{token}': {
        get: {
          tags: ['Public'],
          summary: 'Get invoice payment page data',
          operationId: 'getPublicInvoice',
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' }, description: 'Invoice onchain ID' }],
          responses: {
            '200': { description: 'Invoice data for payment', content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicInvoice' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/public/invoice/{token}/build-payment-tx': {
        post: {
          tags: ['Public'],
          summary: 'Build a payment transaction for the payer',
          operationId: 'buildPaymentTx',
          parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['payerWallet'], properties: { payerWallet: { type: 'string', description: 'Payer Solana wallet address' } } } } } },
          responses: {
            '200': { description: 'Unsigned payment transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTxResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/public/plan/{slug}': {
        get: {
          tags: ['Public'],
          summary: 'Get plan details for subscription page',
          operationId: 'getPublicPlan',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Plan details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Plan' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/public/plan/{slug}/build-subscribe-tx': {
        post: {
          tags: ['Public'],
          summary: 'Build a subscribe transaction for the payer',
          operationId: 'buildSubscribeTx',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['subscriberWallet'], properties: { subscriberWallet: { type: 'string', description: 'Subscriber Solana wallet address' } } } } } },
          responses: {
            '200': { description: 'Unsigned subscribe transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTxResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      // --- Confidential Invoices ---
      '/api/confidential-invoices': {
        get: {
          tags: ['Confidential Invoices'],
          summary: 'List confidential invoices',
          operationId: 'listConfidentialInvoices',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'List of confidential invoices', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ConfidentialInvoice' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Confidential Invoices'],
          summary: 'Create a confidential invoice',
          operationId: 'createConfidentialInvoice',
          security: [{ bearerAuth: [] }],
          description: 'Creates a confidential (encrypted) invoice on-chain with a commitment hash and encrypted blob URL. Returns an unsigned Solana transaction.',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateConfidentialInvoiceBody' } } } },
          responses: {
            '201': { description: 'Confidential invoice created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateConfidentialInvoiceResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      // --- Webhooks (convenience alias) ---
      '/api/webhooks': {
        post: {
          tags: ['Webhooks'],
          summary: 'Register a webhook endpoint',
          operationId: 'registerWebhook',
          security: [{ bearerAuth: [] }],
          description: 'Registers or updates the webhook URL for receiving event notifications. Equivalent to PUT /api/settings/webhook.',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterWebhookBody' } } } },
          responses: {
            '200': { description: 'Webhook registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookConfig' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      // --- Subscriptions POST ---
      '/api/subscriptions': {
        get: {
          tags: ['Subscriptions'],
          summary: 'List subscriptions',
          operationId: 'listSubscriptions',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['Active', 'Paused', 'Cancelled', 'Failed'] } }],
          responses: {
            '200': { description: 'List of subscriptions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subscription' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Subscriptions'],
          summary: 'Create a subscription',
          operationId: 'createSubscription',
          security: [{ bearerAuth: [] }],
          description: 'Creates a subscription for a customer to a plan. Returns subscription details and an unsigned Solana transaction.',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSubscriptionBody' } } } },
          responses: {
            '201': { description: 'Subscription created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSubscriptionResponse' } } } },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'API key with prefix `mlk_live_`. Obtain one at https://marlin.fi/developers/api-keys',
        },
      },
      responses: {
        Unauthorized: { description: 'Missing or invalid authentication', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        ValidationError: { description: 'Request validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: { type: 'string', example: 'Authentication required' },
                details: { type: 'object', additionalProperties: true, nullable: true },
              },
            },
          },
        },
        DataEnvelope: {
          type: 'object',
          description: 'All successful responses wrap the result in a {data} envelope.',
          required: ['data'],
          properties: {
            data: { description: 'The response payload' },
          },
        },
        PaginatedList: {
          type: 'object',
          description: 'All list endpoints use cursor-based pagination.',
          required: ['data', 'has_more', 'cursor'],
          properties: {
            data: { type: 'array', items: {} },
            has_more: { type: 'boolean', description: 'Whether there are more items after this page' },
            cursor: { type: 'string', nullable: true, description: 'Cursor for the next page (id of last item)' },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            version: { type: 'string', example: '1.0.0' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            onchainId: { type: 'string', description: 'On-chain hex identifier' },
            merchantId: { type: 'string' },
            customerId: { type: 'string' },
            mint: { type: 'string', enum: ['USDC', 'PYUSD', 'USDG'] },
            amount: { type: 'string', description: 'Amount in smallest unit (BigInt as string)' },
            status: { type: 'string', enum: ['Open', 'Paid', 'Void', 'Expired'] },
            memo: { type: 'string', nullable: true },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            customer: {
              type: 'object',
              nullable: true,
              properties: {
                walletAddress: { type: 'string' },
                label: { type: 'string', nullable: true },
              },
            },
          },
        },
        CreateInvoiceBody: {
          type: 'object',
          required: ['customerWallet', 'mint', 'lineItems'],
          properties: {
            customerWallet: { type: 'string', description: 'Customer Solana wallet address' },
            customerEmail: { type: 'string', format: 'email' },
            customerLabel: { type: 'string' },
            mint: { type: 'string', enum: ['USDC', 'PYUSD', 'USDG'] },
            lineItems: {
              type: 'array',
              items: {
                type: 'object',
                required: ['unitPrice', 'quantity'],
                properties: {
                  unitPrice: { type: 'string', description: 'Decimal string (e.g. "9.99")' },
                  quantity: { type: 'integer', minimum: 1 },
                  description: { type: 'string' },
                },
              },
            },
            taxBps: { type: 'integer', minimum: 0, maximum: 10000, default: 0, description: 'Tax in basis points' },
            memo: { type: 'string', maxLength: 500 },
            dueDate: { type: 'string', format: 'date-time' },
          },
        },
        CreateInvoiceResponse: {
          type: 'object',
          properties: {
            invoice: { $ref: '#/components/schemas/Invoice' },
            unsignedTx: { type: 'string', description: 'Base64-encoded unsigned Solana transaction' },
            hostedCheckoutUrl: { type: 'string', format: 'uri' },
          },
        },
        Plan: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            onchainId: { type: 'string' },
            merchantId: { type: 'string' },
            mint: { type: 'string', enum: ['USDC', 'PYUSD', 'USDG'] },
            amount: { type: 'string', description: 'Amount per interval (BigInt as string)' },
            intervalSeconds: { type: 'integer', description: 'Billing interval in seconds' },
            label: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            _count: { type: 'object', properties: { subscriptions: { type: 'integer' } } },
          },
        },
        CreatePlanBody: {
          type: 'object',
          required: ['mint', 'amount', 'intervalSeconds', 'label'],
          properties: {
            mint: { type: 'string', enum: ['USDC', 'PYUSD', 'USDG'] },
            amount: { type: 'string', description: 'Decimal amount (e.g. "29.99")' },
            intervalSeconds: { type: 'integer', description: 'Billing interval in seconds (e.g. 2592000 for monthly)' },
            label: { type: 'string' },
            description: { type: 'string' },
          },
        },
        CreatePlanResponse: {
          type: 'object',
          properties: {
            plan: { $ref: '#/components/schemas/Plan' },
            unsignedTx: { type: 'string', description: 'Base64-encoded unsigned Solana transaction' },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            planId: { type: 'string' },
            customerId: { type: 'string' },
            status: { type: 'string', enum: ['Active', 'Paused', 'Cancelled', 'Failed'] },
            currentPeriodStart: { type: 'string', format: 'date-time', nullable: true },
            currentPeriodEnd: { type: 'string', format: 'date-time', nullable: true },
            cancelledAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            plan: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                amount: { type: 'string' },
                mint: { type: 'string' },
                intervalSeconds: { type: 'integer' },
              },
            },
            customer: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                walletAddress: { type: 'string' },
                label: { type: 'string', nullable: true },
              },
            },
          },
        },
        Charge: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            subscriptionId: { type: 'string' },
            amount: { type: 'string' },
            status: { type: 'string', enum: ['Pending', 'Paid', 'Failed'] },
            txSignature: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            walletAddress: { type: 'string' },
            label: { type: 'string', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            merchantId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            _count: { type: 'object', properties: { invoices: { type: 'integer' }, subscriptions: { type: 'integer' } } },
          },
        },
        CreateCustomerBody: {
          type: 'object',
          required: ['walletAddress'],
          properties: {
            walletAddress: { type: 'string', description: 'Solana wallet address' },
            email: { type: 'string', format: 'email' },
            label: { type: 'string' },
          },
        },
        WebhookConfig: {
          type: 'object',
          properties: { webhookUrl: { type: 'string', format: 'uri', nullable: true } },
        },
        UpdateWebhookBody: {
          type: 'object',
          required: ['webhookUrl'],
          properties: { webhookUrl: { type: 'string', format: 'uri', description: 'HTTPS URL to receive events' } },
        },
        WebhookDelivery: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            event: { type: 'string', description: 'Event type (e.g. invoice.paid)' },
            status: { type: 'string', enum: ['success', 'failed'] },
            httpStatus: { type: 'integer', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            prefix: { type: 'string', description: 'First 8 chars of the key' },
            createdAt: { type: 'string', format: 'date-time' },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        ApiKeyCreated: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            key: { type: 'string', description: 'Full API key (shown only once)' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PublicInvoice: {
          type: 'object',
          properties: {
            onchainId: { type: 'string' },
            merchant: { type: 'object', properties: { walletAddress: { type: 'string' }, label: { type: 'string', nullable: true } } },
            mint: { type: 'string' },
            amount: { type: 'string' },
            status: { type: 'string' },
            memo: { type: 'string', nullable: true },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        UnsignedTxResponse: {
          type: 'object',
          properties: {
            unsignedTx: { type: 'string', description: 'Base64-encoded serialized Solana transaction' },
            blockhash: { type: 'string' },
            lastValidBlockHeight: { type: 'integer' },
          },
        },
        ConfidentialInvoice: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            onchainId: { type: 'string' },
            merchantId: { type: 'string' },
            commitmentHash: { type: 'string', description: '64-character hex string (32-byte hash)' },
            recipientPubkey: { type: 'string', description: 'Base64-encoded 32-byte recipient public key' },
            encryptedBlobUrl: { type: 'string', description: 'URL to the encrypted invoice data blob (max 128 bytes)' },
            status: { type: 'string', enum: ['Open', 'Paid', 'Void'] },
            createdAt: { type: 'string', format: 'date-time' },
            hostedCheckoutUrl: { type: 'string', format: 'uri' },
          },
        },
        CreateConfidentialInvoiceBody: {
          type: 'object',
          required: ['commitmentHash', 'recipientPubkey', 'encryptedBlobUrl'],
          properties: {
            commitmentHash: { type: 'string', description: '64-character hex string representing the 32-byte commitment hash of the invoice details' },
            recipientPubkey: { type: 'string', description: 'Base64-encoded 32-byte recipient public key for encryption' },
            encryptedBlobUrl: { type: 'string', description: 'URL to the encrypted invoice blob (max 128 bytes when UTF-8 encoded)' },
          },
        },
        CreateConfidentialInvoiceResponse: {
          type: 'object',
          properties: {
            confidentialInvoice: { $ref: '#/components/schemas/ConfidentialInvoice' },
            unsignedTx: { type: 'string', description: 'Base64-encoded unsigned Solana transaction' },
            hostedCheckoutUrl: { type: 'string', format: 'uri' },
          },
        },
        RegisterWebhookBody: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', format: 'uri', description: 'HTTPS URL to receive webhook events' },
          },
        },
        CreateSubscriptionBody: {
          type: 'object',
          required: ['planId', 'customerWallet'],
          properties: {
            planId: { type: 'string', description: 'ID of the plan to subscribe to' },
            customerWallet: { type: 'string', description: 'Solana wallet address of the subscriber' },
          },
        },
        CreateSubscriptionResponse: {
          type: 'object',
          properties: {
            subscription: { $ref: '#/components/schemas/Subscription' },
            unsignedTx: { type: 'string', description: 'Base64-encoded unsigned Solana transaction' },
          },
        },
      },
    },
  }
}
