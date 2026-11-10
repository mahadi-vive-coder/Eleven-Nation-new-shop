# 05 — SUPABASE EDGE FUNCTIONS ARCHITECTURE

## Server-Authoritative Operations & Security Boundaries

### Purpose
Privileged operations requiring the `SUPABASE_SERVICE_ROLE_KEY` or merchant API credentials must **never** be performed by the frontend browser. Instead, they execute within isolated Supabase Edge Functions.

> **Status Notice**: These functions represent the backend architecture specification for the upcoming admin and courier phase. They are deployed via the Supabase CLI (`supabase functions deploy <name>`), not through the frontend bundle. Do not treat them as currently deployed until deployed to your Supabase project.

---

### Required Edge Functions Specification

#### 1. `steadfast-dispatch`
- **Trigger**: Invoked by an authenticated administrator (`order_manager` or `super_admin`) from the Admin Panel.
- **Workflow**:
  1. Validates caller JWT with `authenticateAdminRequest()`.
  2. Calls `claim_order_for_dispatch(order_id, 'steadfast')` using service role to acquire atomic DB lease.
  3. Sends HTTPS request to Steadfast Courier Portal API (`https://portal.steadfast.com.bd/api/v1/create_order`) with `STEADFAST_API_KEY` and `STEADFAST_SECRET_KEY`.
  4. On Steadfast success (returns `consignment_id` and `tracking_code`):
     - Calls `finalize_order_dispatch(order_id, consignment_id, tracking_code, 'steadfast')`.
     - Transitions order to `shipped`.
  5. On failure or network timeout:
     - Calls `release_order_dispatch_claim(order_id, 'steadfast')` to release the lease safely.

#### 2. `steadfast-webhook`
- **Trigger**: Inbound HTTP POST from Steadfast Courier webhook servers.
- **Workflow**:
  1. Verifies payload signature or webhook secret token (`STEADFAST_WEBHOOK_SECRET`).
  2. Extracts `consignment_id`, `status` (e.g., `delivered`, `cancelled`, `returned`).
  3. Calls database RPC `process_steadfast_webhook(p_consignment_id, p_courier_status, p_raw_payload)`.
  4. Database function transactionally deduplicates the event, records `courier_webhook_events`, updates shipment status, and transitions the order state machine.

#### 3. `generate-invoice`
- **Trigger**: Cron job or queue worker checking `public.invoice_queue`.
- **Workflow**:
  1. Atomically claims pending jobs via `claim_invoice_queue_jobs(p_batch_size, p_worker_id)`.
  2. Generates server-side A4 PDF document containing order metadata, line items, and store credentials.
  3. Uploads PDF to private Supabase Storage bucket (`invoices/{order_number}.pdf`).
  4. Updates `public.invoices` table and marks job complete via `complete_invoice_queue_job()`.

---

### Environment Variables for Edge Functions (Set in Supabase Dashboard)
In your Supabase Project Settings under **Edge Functions > Secrets**, configure:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STEADFAST_API_KEY`
- `STEADFAST_SECRET_KEY`
- `STEADFAST_WEBHOOK_SECRET`
