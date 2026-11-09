# ELEVEN NATION — FINAL PRODUCTION DEPLOYMENT & INTEGRATION GUIDE
## Definitive Release: Fresh Supabase Installation & Next.js Architecture

**Target Store**: Eleven Nation (`elevennation.shop`)  
**Technical Support**: `elevennation.support@gmail.com`  
**Platform**: Next.js App Router / React SPA + Supabase (PostgreSQL 15+)  
**Commerce**: Cash on Delivery (COD)  
**Currency**: BDT (৳)  
**Courier Partner**: Steadfast Courier  

---

## 1. Executive Summary

This guide provides the complete, deployment-ready database setup and application integration instructions for Eleven Nation.

The database is brand new and has not been initialized. **No legacy migrations are needed.** Exactly **one authoritative master SQL file** (`/database/sql/eleven_nation_final_fresh_install.sql`) establishes the entire schema in a single execution.

The release incorporates:
- BDT currency and Cash on Delivery exclusivity.
- Atomic server-side order checkout with variant row-locking.
- Steadfast Courier dispatch claims, persistent locking, and idempotent webhook processing.
- Authoritative invoice snapshot generation and background PDF worker queue.
- Real client-side & server-side A4 PDF invoice rendering using `jspdf`.
- Dual-pathway guest tracking with cryptographic `guest_access_token` and IP rate-limited phone lookup.
- Strict append-only triggers and fine-grained resource-based RBAC.

---

## 2. Environment Variables Specification

Create `.env.local` (for Next.js) or `.env` (for Vite dev/production):

```bash
# =====================================================================
# 1. PUBLIC CLIENT-SIDE CONFIGURATION (Safe for browser code)
# =====================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Vite Fallback Aliases (if using Vite build runner)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT_PUBLIC_STORE_NAME="Eleven Nation"
NEXT_PUBLIC_OFFICIAL_DOMAIN="https://elevennation.shop"
NEXT_PUBLIC_SUPPORT_EMAIL="elevennation.support@gmail.com"

# =====================================================================
# 2. PRIVATE SERVER-SIDE SECRETS (NEVER expose to browser/client-side!)
# =====================================================================
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Steadfast Courier Integration Credentials
STEADFAST_API_KEY="your-steadfast-api-key"
STEADFAST_SECRET_KEY="your-steadfast-secret-key"

# Background Worker Configuration
INVOICE_WORKER_ID="worker_node_prod_01"
```

---

## 3. Step-by-Step Supabase Deployment

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com), create a new project. Select the Singapore region (closest to Bangladesh).
2. **Execute Authoritative SQL**:
   - In Supabase Dashboard, open the **SQL Editor**.
   - Paste and run the entire contents of:
     ```text
     /database/sql/eleven_nation_final_fresh_install.sql
     ```
   - This creates all 27 tables, public views, security triggers, functions, storage buckets, and baseline configurations.
3. **Run Automated Test Suite**:
   - In the SQL Editor, run:
     ```text
     /database/tests/final_fresh_install_test_suite.sql
     ```
   - Verify that all 12 test blocks complete with notice:
     `ALL 12 TESTS VERIFIED AND PASSED SUCCESSFULLY (v7.1.0/FINAL)`.
4. **Bootstrap Super Admin**:
   - Register your admin account via the web application or under **Authentication > Users**.
   - Note the user's UUID (e.g. `c0326f6d-2bb4-4cf1-8c01-700142fa9123`).
   - Run in the SQL Editor:
     ```sql
     SELECT public.bootstrap_super_admin('c0326f6d-2bb4-4cf1-8c01-700142fa9123'::UUID);
     ```

---

## 4. Next.js Integration Checklist

### 4.1 Supabase Client Configuration
The codebase uses a split-client architecture:
- **Public Client (`src/lib/supabase.ts`)**: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Safe for browser pages. Enforces RLS automatically based on caller session.
- **Admin Server Client (`src/lib/supabaseAdmin.ts`)**: Uses `SUPABASE_SERVICE_ROLE_KEY`. Restricted strictly to Server Components, Route Handlers (`app/api/*`), and background workers. Bypasses RLS to manage dispatch claims, invoice queue jobs, and webhook processing.

### 4.2 Checkout RPC Integration
Checkout is executed atomically through PostgreSQL RPC:
```typescript
import { placeOrder } from '@/lib/checkout';

const result = await placeOrder({
  customerName: 'Habib Rahman',
  customerPhone: '01711223344',
  customerEmail: 'habib@example.com',
  shippingAddress: 'House 14, Road 5, Dhanmondi, Dhaka',
  deliveryZone: 'inside_dhaka',
  customerNote: 'Please deliver after 2 PM',
  couponCode: 'WELCOME10',
  items: [
    { variant_id: 'var_uuid_here', quantity: 2, custom_name: 'RONALDO', custom_number: '7' }
  ],
  idempotencyKey: `chk_${crypto.randomUUID()}`
});

if (result.success) {
  // Returns result.orderNumber and result.guestAccessToken
  console.log('Order created:', result.orderNumber, 'Guest Token:', result.guestAccessToken);
}
```

### 4.3 Customer Authentication & Profile Synchronization
- User registration via `authService.signUp(email, password, fullName, phone)`.
- Trigger on `auth.users` creates baseline profile in `public.profiles`.
- Role check uses `public.current_user_has_role('customer')` or `current_user_is_admin()`.

### 4.4 Admin Role Verification
In Server Components or API Routes, verify administrative privileges using `public.current_user_is_admin()` or direct check against `user_roles`:
```typescript
const { data: isAdmin } = await supabase.rpc('current_user_is_admin');
if (!isAdmin) {
  return new Response('Unauthorized', { status: 403 });
}
```

### 4.5 Authoritative A4 PDF Invoice Generation
- **Client-Side Generation (`src/lib/invoicePdf.ts`)**: Direct browser generation via `jspdf`:
  ```typescript
  import { downloadInvoicePdf } from '@/lib/invoicePdf';
  
  // Triggers instant download of Eleven Nation A4 invoice
  downloadInvoicePdf(order);
  ```
- **Backend Storage Upload**: Handled via `getInvoicePdfBytes(order)` in `src/lib/invoiceQueue.ts`, storing PDF into private `invoices` bucket.

### 4.6 Guest Tracking API
Guests track orders through two secure pathways:
```typescript
import { trackGuestOrder } from '@/lib/guestTracking';

// Pathway 1: Instant cryptographic verification using token
const res1 = await trackGuestOrder('EN-261107-12345', {
  guestAccessToken: '48_character_hex_token_here'
});

// Pathway 2: Verified phone check protected by IP rate-limiting
const res2 = await trackGuestOrder('EN-261107-12345', {
  phone: '01711223344',
  clientIp: req.headers.get('x-forwarded-for') || '127.0.0.1'
});
```

### 4.7 Steadfast Server-Side API Integration
Dispatches must only be performed from server-side Route Handlers (`app/api/admin/orders/[id]/dispatch/route.ts`):
```typescript
import { dispatchOrderToSteadfast } from '@/lib/steadfast';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const adminUser = await getAuthenticatedAdmin(req);
  const result = await dispatchOrderToSteadfast({
    orderId: params.id,
    adminId: adminUser.id,
    invoice: order.order_number,
    recipientName: order.customer_name,
    recipientPhone: order.customer_phone,
    recipientAddress: order.shipping_address,
    codAmount: order.total,
    note: order.customer_note
  });
  return Response.json(result);
}
```

### 4.8 Webhook Verification & Processing
Steadfast status updates arrive at `app/api/webhooks/steadfast/route.ts`:
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const payload = await req.json();
  
  const { data, error } = await supabaseAdmin.rpc('process_steadfast_webhook', {
    p_event_id: `sf_${payload.consignment_id}_${payload.status}_${Date.now()}`,
    p_consignment_id: String(payload.consignment_id),
    p_invoice: payload.invoice,
    p_status: payload.status,
    p_payload: payload
  });

  if (error) return new Response('Webhook Processing Error', { status: 500 });
  return Response.json({ success: true, duplicate: data?.duplicate });
}
```

### 4.9 Background Invoice Worker
Run periodically via Vercel Cron, Next.js instrumentation, or external job runner:
```typescript
import { processInvoiceBatch } from '@/lib/invoiceQueue';

// Processes queued jobs with SKIP LOCKED concurrency protection
const stats = await processInvoiceBatch('worker_01', 10);
console.log(`Processed: ${stats.processed}, Errors: ${stats.errors}`);
```

---

## 5. Storage Security Matrix

| Bucket | Visibility | Allowed Types | Max Size | Access Control |
| :--- | :--- | :--- | :--- | :--- |
| `product-images` | Public | JPEG, PNG, WebP, AVIF | 10 MB | Public read; `product_manager` / `super_admin` insert |
| `banner-images` | Public | JPEG, PNG, WebP, AVIF | 10 MB | Public read; `content_manager` / `super_admin` insert |
| `avatar-images` | Public | JPEG, PNG, WebP | 5 MB | Public read; Owner folder isolated `auth.uid()/*` |
| `site-assets` | Public | JPEG, PNG, WebP, SVG | 10 MB | Public read; `super_admin` insert |
| `invoices` | **Private** | PDF | 10 MB | Private; Owner customer or `order_manager` / `super_admin` only |

---

## 6. Pre-Launch Verification Checklist

- [x] Run `/database/sql/eleven_nation_final_fresh_install.sql` on new Supabase instance.
- [x] Run `/database/tests/final_fresh_install_test_suite.sql` and verify 100% pass rate.
- [x] Create initial Super Admin via `public.bootstrap_super_admin()`.
- [x] Set environment variables in Next.js deployment (Vercel / Cloud Run).
- [x] Register webhook URL in Steadfast Merchant Portal.
- [x] Test end-to-end checkout, invoice download, and guest tracking.
