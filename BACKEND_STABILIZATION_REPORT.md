# ELEVEN NATION — PHASE 2: BACKEND STABILIZATION REPORT
## Architectural Audit, Server Secret Isolation & Edge Functions Implementation

**Repository:** `mahadi-vive-coder/Eleven-Nation-new-shop`  
**Brand:** ELEVEN NATION (`elevennation.shop`)  
**Technical Email:** `elevennation.support@gmail.com`  
**Platform:** React 19 + TypeScript + Vite (Client) / Supabase PostgreSQL 15+ & Supabase Edge Functions (Backend)  
**Commerce Model:** Cash on Delivery (COD) across 64 districts of Bangladesh  
**Courier Partner:** Steadfast Courier (`https://portal.steadfast.com.bd`)  
**Document Status:** Complete Phase 2 Engineering Deliverable  

---

## 1. Executive Summary

Phase 2: Backend Stabilization transitions all privileged operations, external courier communications, background invoice workers, and database administrative maintenance from the client bundle to isolated, server-authoritative **Supabase Edge Functions**.

### Key Achievements in Phase 2:
1. **Frontend Bundle Hardening & Zero Secret Leakage:** Completely purged all server-only files (`supabaseAdmin.ts`, `steadfast.ts`, `invoiceWorker.ts`, `invoiceQueue.ts`, `supabaseServer.ts`) from `src/lib/`. The client bundle now contains zero references to `SUPABASE_SERVICE_ROLE_KEY`, `STEADFAST_API_KEY`, or `STEADFAST_SECRET_KEY`.
2. **Supabase Edge Functions Implementation (`supabase/functions/`):** Built 4 production-ready Deno/TypeScript edge functions (`steadfast-dispatch`, `steadfast-webhook`, `invoice-worker`, `admin-operations`) powered by modular shared utilities for CORS, authentication, and database client creation.
3. **Database Architecture Preservation:** Strict adherence to database preservation rules:
   - The 27 existing public tables, RLS policies, indexes, and constraints remain 100% intact.
   - Zero SQL was automatically executed against the live database.
   - No tables were dropped, recreated, or truncated.
4. **PostgreSQL Security Model & View Definer Audit:** Conducted a comprehensive audit of all 17 `SECURITY DEFINER` functions and the `public_product_variants` catalog view. Prepared an incremental reviewed migration (`001_review_public_product_variants_view.sql`) labeled `[DO NOT RUN YET — REVIEW REQUIRED]` documenting why PostgreSQL 15+ definer semantics (`security_invoker = false`) are mandatory to keep the storefront active while safeguarding raw inventory counts.
5. **Automated Verification:** Added a comprehensive automated test suite (`tests/backend_stabilization.test.ts`) covering bundle hygiene, file layout, migration headers, financial calculations, IP spoof resistance, and Edge Function request parsing. All 8 test suites pass successfully (100% green).

---

## 2. Server Secret Isolation & Client Bundle Cleanup

### 2.1. Purged Files from `src/lib/`
During the audit, five files in `src/lib/` were found to instantiate the Supabase client using `process.env.SUPABASE_SERVICE_ROLE_KEY` or call Steadfast API endpoints with `STEADFAST_API_KEY`. These files have been permanently deleted from the client repository:

| Deleted File | Reason for Purge | New Location / Handler |
|---|---|---|
| `src/lib/supabaseAdmin.ts` | Contained service role key client initialization | Moved to `supabase/functions/_shared/supabaseClient.ts` |
| `src/lib/steadfast.ts` | Contained courier API keys and dispatch logic | Moved to `supabase/functions/steadfast-dispatch/index.ts` |
| `src/lib/invoiceWorker.ts` | Contained server-side invoice generation loop | Moved to `supabase/functions/invoice-worker/index.ts` |
| `src/lib/invoiceQueue.ts` | Contained queue polling with service role RPCs | Handled by `invoice-worker` Edge Function |
| `src/lib/supabaseServer.ts` | Server-side helper using server environment | Not required in Vite client bundle |

### 2.2. Verified Client-Safe Modules in `src/lib/`
Only client-safe, unprivileged modules now reside in `src/lib/`:
- `src/lib/supabase.ts`: Connects to Supabase using only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/lib/checkout.ts`: Formats checkout payloads and calls public RPC `place_order_atomic()` through the anonymous/authenticated client.
- `src/lib/guestTracking.ts`: Performs secure client IP extraction and calls public RPC `track_guest_order()`.
- `src/lib/invoicePdf.ts`: Client-side printable HTML generator for browser viewing/saving.

### 2.3. Environment Variable Hygiene
- `vite.config.ts`: Configured with `envPrefix: 'VITE_'`, ensuring Vite refuses to expose any environment variable lacking the `VITE_` prefix to client-side code.
- `.env.example`: Sanitized to only list required public client variables:
  ```ini
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

---

## 3. Supabase Edge Functions Architecture

All server-side and background tasks are now consolidated into Deno/TypeScript functions under `supabase/`:

```
supabase/
├── config.toml                              # Function routing & JWT configuration
├── README.md                                # Deployment, secrets & testing guide
└── functions/
    ├── _shared/
    │   ├── cors.ts                          # CORS headers & OPTIONS preflight handler
    │   ├── supabaseClient.ts                # createAdminClient() & createUserClient()
    │   └── auth.ts                          # requireAdminAuth() role validation
    ├── steadfast-dispatch/
    │   └── index.ts                         # Courier dispatch with atomic lease locking
    ├── steadfast-webhook/
    │   └── index.ts                         # Inbound webhook receiver with deduplication
    ├── invoice-worker/
    │   └── index.ts                         # Asynchronous PDF/HTML invoice processor
    └── admin-operations/
        └── index.ts                         # Metrics, courier balance & maintenance
```

### 3.1. Detailed Function Breakdown

#### 1. `steadfast-dispatch`
- **Purpose:** Dispatches an order to Steadfast Courier without risk of duplicate consignment creation.
- **Security:** Requires a valid Supabase JWT for a user assigned the `super_admin` or `order_manager` role in `public.user_roles`.
- **Concurrency & Atomicity:**
  1. Calls `claim_order_for_dispatch(p_order_id, p_courier_code, p_admin_id)` to acquire a 5-minute atomic database lease.
  2. If another admin or process has claimed the order within the lease window, the database rejects the request with an error.
  3. Checks Steadfast consignment status (`/status_by_invoice`) if previously dispatched.
  4. Calls Steadfast API (`/create_order`) with customer details and cod_amount.
  5. Upon success, calls `finalize_order_dispatch()` to store `consignment_id`, `tracking_code`, and set order status to `shipped`.
  6. On network failure or rejection, calls `release_order_dispatch_claim()` to allow immediate retry.

#### 2. `steadfast-webhook`
- **Purpose:** Ingests status updates from Steadfast (`delivered`, `cancelled`, `partial_delivered`, `returned`).
- **Security:** Authenticates via `STEADFAST_WEBHOOK_SECRET` passed in headers (`x-webhook-secret`), bearer tokens, or query parameters.
- **Deduplication:** Invokes `process_steadfast_webhook(p_event_id, p_consignment_id, p_invoice, p_status, p_payload)`. PostgreSQL records the event in `public.courier_webhook_events`. If already processed, it returns an idempotent success response without reapplying order status mutations.

#### 3. `invoice-worker`
- **Purpose:** Asynchronous background worker for invoice PDF generation and storage.
- **Security:** Authenticated via `CRON_SECRET` bearer token or admin user JWT.
- **Concurrency:** Calls `claim_invoice_queue_jobs(p_limit, p_worker_id, p_lease_seconds)`. PostgreSQL executes `SELECT ... FOR UPDATE SKIP LOCKED` on `public.invoice_queue`, guaranteeing that parallel workers never process the same invoice job.
- **Storage:** Uploads rendered HTML/PDF invoice to the private `invoices` bucket and registers the signed URL in `public.orders`.

#### 4. `admin-operations`
- **Purpose:** Operational dashboard aggregations and maintenance triggers.
- **Actions:**
  - `metrics`: Returns counts of pending orders, queued invoices, low stock items, and unassigned orders.
  - `courier_balance`: Queries Steadfast API (`/get_balance`) to return live balance in BDT.
  - `routine_cleanup`: Calls `execute_routine_maintenance()` to expire abandoned checkout keys and release timed-out dispatch claims.

---

## 4. PostgreSQL Security Model Audit & View Analysis

### 4.1. Audit of the 17 `SECURITY DEFINER` Functions
All 17 `SECURITY DEFINER` functions defined in the master schema (`eleven_nation_final_fresh_install.sql`) were audited:

1. `place_order_atomic`: Strict `search_path = public, pg_temp`. Validates inventory locks, computes immutable prices server-side, checks financial consistency, and inserts order + items in a single transaction.
2. `track_guest_order`: Strict `search_path = public, pg_temp`. Rate-limited per IP, enforces phone number match against SHA-256 hashed guest access token. Returns customer-sanitized order summary without exposing internal notes or financial audit logs.
3. `claim_order_for_dispatch`: Requires `service_role` or admin role verification. Sets 5-minute atomic claim timestamp.
4. `finalize_order_dispatch`: Transition-validated order status change with tracking metadata recording.
5. `release_order_dispatch_claim`: Safe recovery releasing claim timestamp.
6. `process_steadfast_webhook`: Restricted to `service_role`. Idempotent recording in `courier_webhook_events`.
7. `claim_invoice_queue_jobs`: Restricted to `service_role`. Employs `FOR UPDATE SKIP LOCKED`.
8. `complete_invoice_queue_job`: Restricted to `service_role`. Marks job completed and stores storage path.
9. `fail_invoice_queue_job`: Restricted to `service_role`. Increments retry counter and records error message.
10. `execute_routine_maintenance`: Restricted to `service_role` or `super_admin`. Purges expired idempotency keys and unlocks expired claims.
11. `current_user_has_role`: Helper inspecting `public.user_roles` against `auth.uid()`.
12. `current_user_has_any_role`: Array-based role checker.
13. `current_user_is_admin`: Evaluates `super_admin` or `order_manager`.
14. `handle_new_user`: Auth trigger creating initial profile on `auth.users` insertion.
15. `log_financial_audit`: Trigger function logging immutable financial changes.
16. `prevent_financial_mutation`: Trigger function preventing unauthorized updates to completed order financial fields.
17. `cleanup_expired_idempotency_keys`: Routine cleanup worker.

**Audit Verdict:** All functions explicitly set `SET search_path = public, pg_temp`, preventing search path hijacking. Privilege checks (`service_role` or `current_user_is_admin()`) are enforced at the top of every administrative function.

### 4.2. In-Depth Security Analysis of `public_product_variants` View
- **The Base Table Protection:** `public.product_variants` contains commercial secrets: raw supplier stock quantities, reorder thresholds, and internal SKU notes. RLS is strictly enabled with the policy:
  ```sql
  CREATE POLICY "Variants viewable by product_manager or super_admin"
  ON public.product_variants FOR SELECT
  USING (current_user_has_any_role(ARRAY['product_manager'::user_role, 'super_admin'::user_role]));
  ```
  Anonymous visitors (`anon`) and regular customers (`authenticated`) have **NO** direct SELECT privileges on `public.product_variants`.
- **The Role of `public.public_product_variants`:** The view projects public attributes and converts confidential raw numbers into a simple boolean flag:
  ```sql
  (stock > 0) AS in_stock
  ```
- **PostgreSQL 15+ Security Mechanics:**
  - If a view is configured with `security_invoker = true`, PostgreSQL checks underlying table RLS using the *calling user's* identity.
  - For store visitors, this check would fail, returning **ZERO** variants and completely breaking the storefront catalog.
  - By maintaining `security_invoker = false` (view definer mode), PostgreSQL executes the query with the view owner's privileges while exposing only the whitelisted columns and boolean availability.
- **Migration Prepared:**
  `database/02_SQL_EDITOR_EXECUTION/001_review_public_product_variants_view.sql` has been created with status **`[DO NOT RUN YET — REVIEW REQUIRED]`**. It explicitly documents these security mechanics and adds `security_barrier = true` to protect against optimizer leakages.

---

## 5. Automated Verification & Testing

### 5.1. Test Suite: `tests/backend_stabilization.test.ts`
Executed with: `npx tsx tests/backend_stabilization.test.ts`

| Test Suite | Verifications Performed | Status |
|---|---|---|
| **Test 1: Bundle Hygiene** | Confirms all 5 server-only files are deleted; verifies zero occurrences of `SUPABASE_SERVICE_ROLE_KEY` or `STEADFAST_API_KEY` in `src/lib/`. | **PASS** |
| **Test 2: Edge Functions Structure** | Verifies existence of all 9 Edge Function files and configuration scripts in `supabase/`. | **PASS** |
| **Test 3: Migration Safety** | Confirms `001_review_public_product_variants_view.sql` contains `[DO NOT RUN YET — REVIEW REQUIRED]` and `security_invoker = false`. | **PASS** |
| **Test 4: Checkout Financials** | Verifies ৳70 delivery inside Dhaka, ৳130 outside Dhaka, and free delivery threshold (৳2,500). | **PASS** |
| **Test 5: Guest Tracking IP Parsing** | Verifies Cloudflare header priority (`cf-connecting-ip`), multi-hop leftmost extraction, and error throwing on empty headers. | **PASS** |
| **Test 6: Edge Function Auth** | Verifies `auth.ts` queries `public.user_roles` for `super_admin` or `order_manager` and CORS preflight handling. | **PASS** |
| **Test 7: Steadfast Webhook & Dispatch** | Verifies atomic lease RPC calls and webhook deduplication via `process_steadfast_webhook`. | **PASS** |
| **Test 8: Invoice Queue Concurrency** | Verifies `claim_invoice_queue_jobs`, `complete_invoice_queue_job`, and retry counting. | **PASS** |

### 5.2. Audit Test Suite: `tests/audit_and_checkout.test.ts`
Executed with: `npx tsx tests/audit_and_checkout.test.ts`
- **Result:** 5/5 passed (IP validation, Edge header priority, product/variant mapping, cart item preservation, color extraction).

---

## 6. Production Deployment & Operational Guide

### 6.1. Setting Secrets in Remote Supabase
Run the following commands using the Supabase CLI:

```bash
supabase link --project-ref <your-project-id>

supabase secrets set \
  STEADFAST_API_KEY="your-production-steadfast-api-key" \
  STEADFAST_SECRET_KEY="your-production-steadfast-secret-key" \
  STEADFAST_WEBHOOK_SECRET="your-high-entropy-webhook-secret" \
  CRON_SECRET="your-high-entropy-cron-secret"
```

### 6.2. Deploying Edge Functions
```bash
supabase functions deploy steadfast-dispatch --no-verify-jwt
supabase functions deploy steadfast-webhook --no-verify-jwt
supabase functions deploy invoice-worker --no-verify-jwt
supabase functions deploy admin-operations --no-verify-jwt
```

### 6.3. Configuring Steadfast Webhook
In your Steadfast Courier Merchant Portal:
1. Navigate to **Settings > Webhook Settings**.
2. Set Webhook URL to:
   `https://<your-project-id>.supabase.co/functions/v1/steadfast-webhook`
3. Set Secret Token to match your configured `STEADFAST_WEBHOOK_SECRET`.
4. Enable events for **Status Updates** (`delivered`, `cancelled`, `partial_delivered`, `returned`).

---

## 7. Sign-Off & Verification Checklist

- [x] All server-side secrets removed from `src/lib/` and client bundle.
- [x] 4 Supabase Edge Functions created with shared CORS and auth utilities.
- [x] Database 27 public tables and data preserved without modification.
- [x] 17 SECURITY DEFINER functions audited for search_path and authorization.
- [x] View security model for `public_product_variants` fully audited and documented.
- [x] Incremental migration `001_review_public_product_variants_view.sql` prepared and marked `[DO NOT RUN YET — REVIEW REQUIRED]`.
- [x] Automated test suite passing with 100% success rate.
- [x] Documentation delivered in `supabase/README.md`, `UPDATES.md`, and `BACKEND_STABILIZATION_REPORT.md`.
