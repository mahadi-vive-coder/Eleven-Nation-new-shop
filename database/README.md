# ELEVEN NATION — Database Architecture & Supabase Specification
## Definitive Production Release: Fresh Install Architecture

This directory houses the authoritative PostgreSQL/Supabase database schema, storage bucket security policies, executable test suites, and documentation for **ELEVEN NATION** (`elevennation.shop`).

---

## 1. Fresh Production Install (No Legacy Migrations)

The Supabase database is completely new. **No legacy migrations are needed or executed.**

### Authoritative Deployment File:
```text
/database/sql/eleven_nation_final_fresh_install.sql
```
This is the **only SQL file** to run in the Supabase SQL Editor. It creates:
- Core extensions (`uuid-ossp`, `pgcrypto`)
- Complete table schema with strict constraints, indexes, and foreign keys
- Resource-specific Role-Based Access Control (RBAC)
- Strict Row Level Security (RLS) on all 21 tables
- Public views that protect internal inventory levels (`public_product_variants`)
- Append-only audit triggers on `admin_activity_logs`, `inventory_movements`, and `order_status_history`
- Atomic Cash on Delivery checkout function (`place_order_atomic`) with idempotency replay
- Secure guest tracking with unguessable `guest_access_token` and atomic IP rate limiting
- Private and public Supabase Storage buckets with fine-grained storage RLS policies
- Baseline production settings (zero fake/demo data)

---

## 2. Directory Structure

```text
database/
├── README.md                                    # Architecture overview & setup instructions
├── ER_DIAGRAM.md                                # Entity relationship tables & visual diagram
├── sql/
│   └── eleven_nation_final_fresh_install.sql    # THE AUTHORITATIVE Master SQL script
└── tests/
    └── final_fresh_install_test_suite.sql       # Automated SQL test suite with exact assertions
```

*(All superseded legacy scripts and prototypes have been archived in `/archive/legacy-not-for-execution/`)*.

---

## 3. Core Architectural Highlights

1. **BDT & Cash on Delivery (COD)**:
   - Currency is strictly Bangladeshi Taka (BDT / ৳).
   - Checkout is strictly Cash on Delivery.
2. **Manual Courier Dispatch**:
   - Automated 3P courier API calls and webhooks are postponed for this release.
   - Orders include explicit manual dispatch attributes:
     * `courier_name TEXT`
     * `tracking_number TEXT`
     * `courier_notes TEXT`
     * `shipped_at TIMESTAMPTZ`
   - Editable only by authorized administrators (`super_admin`, `order_manager`).
3. **Guest Order Tracking & Guest Access Token**:
   - During checkout, an unguessable 48-character cryptographic token (`guest_access_token`) is generated and returned to the customer.
   - Guests can verify order status or download invoices using this token without requiring an account.
   - Phone verification is protected by atomic IP rate limiting (15 attempts / 15 min window) against brute-force attacks.
4. **Append-Only Audit Security**:
   - `admin_activity_logs`, `inventory_movements`, and `order_status_history` are strictly append-only.
   - Direct `DELETE` and non-whitelisted `UPDATE` attempts are rejected with error code `42501`.
5. **Private Storage & Invoices**:
   - Storage bucket `invoices` is private (`public = false`).
   - Accessible only by order owner, administrators, or signed URLs.
   - Generated client-side or server-side via `jspdf` (`src/lib/invoicePdf.ts`).

---

## 4. How to Apply in Supabase

1. Open your project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor**.
3. Open and run `/database/sql/eleven_nation_final_fresh_install.sql`.
4. (Optional) Run `/database/tests/final_fresh_install_test_suite.sql` to verify database health and security triggers.
5. Create your initial Super Admin:
   - Register a user via Supabase Auth Dashboard or `authService.signUp()`.
   - Call `public.bootstrap_super_admin('<USER_UUID>')` from the Supabase SQL Editor as the database superuser.
