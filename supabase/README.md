# ELEVEN NATION — SUPABASE EDGE FUNCTIONS ARCHITECTURE

This directory contains the production-ready Supabase Edge Functions for Eleven Nation (`elevennation.shop`). All sensitive third-party API integrations, courier communications, invoice background workers, and privileged administrative procedures have been migrated off the client bundle into these isolated Deno/TypeScript edge functions.

---

## 1. Directory Structure

```
supabase/
├── config.toml                              # Edge functions configuration & JWT settings
├── README.md                                # This deployment & operational guide
└── functions/
    ├── _shared/
    │   ├── cors.ts                          # Standardized CORS headers and preflight handler
    │   ├── supabaseClient.ts                # Admin (service role) and caller-authenticated clients
    │   └── auth.ts                          # JWT role verification (requires admin or super_admin)
    ├── steadfast-dispatch/
    │   └── index.ts                         # Atomic courier dispatch, lease locking & consignment creation
    ├── steadfast-webhook/
    │   └── index.ts                         # Inbound Steadfast webhook receiver with deduplication & order transitions
    ├── invoice-worker/
    │   └── index.ts                         # Asynchronous PDF/HTML invoice processor with SKIP LOCKED queue claims
    └── admin-operations/
        └── index.ts                         # Admin metrics summary, courier balance check, and routine maintenance
```

---

## 2. Secrets & Environment Variables

The following secrets must be configured in your Supabase project settings or via the Supabase CLI:

| Variable Name | Required By | Description |
|---|---|---|
| `SUPABASE_URL` | All functions | Injected automatically by the Supabase Edge runtime. |
| `SUPABASE_ANON_KEY` | All functions | Injected automatically by the Supabase Edge runtime. |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions | Injected automatically. Used exclusively by edge functions for privileged RPCs. |
| `STEADFAST_API_KEY` | `steadfast-dispatch`, `admin-operations` | Production API key from Steadfast portal (`https://portal.steadfast.com.bd`). |
| `STEADFAST_SECRET_KEY` | `steadfast-dispatch`, `admin-operations` | Production Secret key from Steadfast portal. |
| `STEADFAST_WEBHOOK_SECRET` | `steadfast-webhook` | Shared secret token configured in Steadfast webhook webhook settings. |
| `CRON_SECRET` | `invoice-worker`, `admin-operations` | Secret authorization bearer token used by scheduled cron triggers. |

To set these secrets in your remote Supabase project:
```bash
supabase secrets set \
  STEADFAST_API_KEY="your-steadfast-api-key" \
  STEADFAST_SECRET_KEY="your-steadfast-secret-key" \
  STEADFAST_WEBHOOK_SECRET="your-webhook-secret" \
  CRON_SECRET="your-high-entropy-cron-secret"
```

---

## 3. Function Details & Endpoints

### 3.1. `steadfast-dispatch`
- **Method:** `POST`
- **Authentication:** Bearer JWT required (caller must hold `super_admin` or `order_manager` role in `public.user_roles`).
- **Behavior:**
  1. Validates caller authorization using JWT claims and database role lookup.
  2. Claims order atomically via database RPC `claim_order_for_dispatch()`, setting a 5-minute lease to prevent concurrent dispatch.
  3. Checks Steadfast consignment status if already submitted.
  4. Posts dispatch request to Steadfast API (`https://portal.steadfast.com.bd/api/v1/create_order`).
  5. Upon success, finalizes the order in PostgreSQL via `finalize_order_dispatch()`, recording tracking code, consignment ID, and transitioning status to `shipped`.
  6. On failure, safely releases the dispatch lease via `release_order_dispatch_claim()`.
- **Payload:**
  ```json
  {
    "order_id": "00000000-0000-0000-0000-000000000000",
    "notes": "Fragile clothing item"
  }
  ```

### 3.2. `steadfast-webhook`
- **Method:** `POST`
- **Authentication:** `X-Webhook-Secret` header or `?secret=` query parameter matching `STEADFAST_WEBHOOK_SECRET`.
- **Behavior:**
  1. Authenticates webhook source against configured secret.
  2. Ingests event payload and checks idempotency in `public.webhook_events`.
  3. Transitions order status atomically via database functions (`delivered`, `cancelled`, `returned`).
  4. Returns `200 OK` with JSON acknowledgment.
- **Sample Payload:**
  ```json
  {
    "consignment_id": 9876543,
    "invoice": "EN-202611-0012",
    "status": "delivered",
    "updated_at": "2026-11-11T12:00:00Z"
  }
  ```

### 3.3. `invoice-worker`
- **Method:** `POST`
- **Authentication:** Bearer token matching `CRON_SECRET` OR an authenticated admin user JWT.
- **Behavior:**
  1. Claims pending invoice generation jobs with `SELECT ... FOR UPDATE SKIP LOCKED` via `claim_invoice_queue_jobs()`.
  2. Renders self-contained printable HTML/PDF invoice with Eleven Nation branding.
  3. Uploads generated invoice to the private `invoices` Supabase Storage bucket.
  4. Generates a signed access URL and marks the job complete via `complete_invoice_queue_job()`.
  5. Automatically handles retries and transitions failed jobs via `fail_invoice_queue_job()`.

### 3.4. `admin-operations`
- **Method:** `POST`
- **Authentication:** Bearer JWT (admin role) OR `CRON_SECRET`.
- **Actions:**
  - `metrics`: Returns real-time counts of pending orders, queued invoices, low-stock items, and unassigned orders.
  - `courier_balance`: Queries Steadfast API (`/get_balance`) to report live courier account balance.
  - `routine_cleanup`: Triggers database maintenance routine `execute_routine_maintenance()`.

---

## 4. Local Development & Testing with Supabase CLI

### 4.1. Prerequisites
- Docker running locally
- Supabase CLI installed (`npm install -g supabase`)

### 4.2. Starting Local Services
```bash
# Start local Supabase container stack
supabase start

# Serve Edge Functions locally with environment variables
supabase functions serve --env-file ./supabase/.env.local
```

Create `./supabase/.env.local` for testing:
```ini
STEADFAST_API_KEY="test_api_key"
STEADFAST_SECRET_KEY="test_secret_key"
STEADFAST_WEBHOOK_SECRET="test_webhook_secret_12345"
CRON_SECRET="test_cron_secret_67890"
```

### 4.3. Testing Endpoints Locally
```bash
# Test CORS preflight on steadfast-dispatch
curl -i -X OPTIONS http://localhost:54321/functions/v1/steadfast-dispatch \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"

# Test webhook authentication rejection (missing secret)
curl -i -X POST http://localhost:54321/functions/v1/steadfast-webhook \
  -H "Content-Type: application/json" \
  -d '{"status":"delivered"}'

# Test webhook with valid secret
curl -i -X POST "http://localhost:54321/functions/v1/steadfast-webhook?secret=test_webhook_secret_12345" \
  -H "Content-Type: application/json" \
  -d '{"consignment_id": 12345, "invoice": "EN-TEST-001", "status": "delivered"}'
```

---

## 5. Deployment Commands

When deploying to the live Supabase project:

```bash
# Link to your Supabase project
supabase link --project-ref <your-supabase-project-id>

# Deploy all Edge Functions
supabase functions deploy steadfast-dispatch --no-verify-jwt
supabase functions deploy steadfast-webhook --no-verify-jwt
supabase functions deploy invoice-worker --no-verify-jwt
supabase functions deploy admin-operations --no-verify-jwt

# Verify deployment
supabase functions list
```
*(Note: `--no-verify-jwt` allows edge functions to manage fine-grained internal authentication, handling both user JWTs and system bearer tokens like `CRON_SECRET`.)*

---

## 6. Security Guarantees

1. **Zero Secret Leakage:** No service role keys or Steadfast API credentials exist in client bundles or public repositories.
2. **Atomic Dispatch Leases:** Prevents duplicate consignments even if multiple admins click "Dispatch" concurrently.
3. **Webhook Idempotency:** Protects against replayed or duplicated courier status updates.
4. **Queue Concurrency:** Uses PostgreSQL `FOR UPDATE SKIP LOCKED` for race-free invoice generation.
