# ELEVEN NATION — DATABASE SQL EXECUTION & MIGRATION ORDER

## CURRENT ACTION: NO SQL EXECUTION REQUIRED.

> **IMPORTANT NOTICE FOR SUPABASE ADMINISTRATOR**:  
> Your Supabase Main Database **ALREADY EXISTS** and is initialized with the master schema.  
> You do **NOT** need to open Supabase SQL Editor or execute any SQL commands at this time.

---

## 1. Quick Decision Matrix for Supabase SQL Editor

| Visual Status Label | What It Means for You |
| :--- | :--- |
| **`[DO NOT RUN — ALREADY APPLIED]`** | This script is already live in your database. Re-running it will cause errors or conflicts. **Leave it untouched.** |
| **`[DO NOT RUN — FRESH INSTALL ONLY]`** | Meant only for a completely blank database. **Never run on your existing database.** |
| **`[TEST ONLY — NOT FOR PRODUCTION]`** | Automated test assertions and temporary data. **Never run on production.** |
| **`[OPTIONAL — RUN ONLY WHEN NEEDED]`** | Auxiliary features (e.g. storage buckets). Only execute if explicitly instructed. |
| **`[VERIFY DATABASE STATE FIRST]`** | Future migration scripts. Must be verified before running. |
| **`[RUN IN SUPABASE SQL EDITOR]`** | An active, pending migration script. *(None currently pending).* |

---

## 2. Complete Inventory of SQL Files

### File 1: Authoritative Master Schema
- **Path**: `database/01_EXISTING_DATABASE/eleven_nation_final_fresh_install.sql`
- **Visual Label**: **`[DO NOT RUN — ALREADY APPLIED]`** & **`[DO NOT RUN — FRESH INSTALL ONLY]`**
- **Classification**: **A. ALREADY APPLIED — DO NOT RUN AGAIN**
- **Purpose**: Establishes all 27 tables, constraints, RLS policies, views (`public_product_variants`), and core RPC functions (`place_order_atomic`, `track_guest_order`, dispatch leases, webhook processor).
- **Should It Be Executed?**: **NO.**
- **Prerequisites**: Only applicable if provisioning an entirely new Supabase project from scratch.
- **Risk Level**: **CRITICAL / DESTRUCTIVE if run on active database.**
- **Reason**: The existing database already has these tables, constraints, and functions. Running it again could conflict with live data or fail due to duplicate object definitions.

---

### File 2: Database Test Suite
- **Path**: `database/04_TESTS/final_fresh_install_test_suite.sql`
- **Visual Label**: **`[TEST ONLY — NOT FOR PRODUCTION]`**
- **Classification**: **D. TEST ONLY — NEVER RUN AS PRODUCTION SETUP**
- **Purpose**: Tests checkout idempotency, append-only triggers, courier claims, and RLS isolation.
- **Should It Be Executed?**: **NO.**
- **Prerequisites**: Isolated temporary test environment only.
- **Risk Level**: **HIGH.** Inserts test data and executes transaction rollbacks.
- **Reason**: Test scripts are designed for automated verification, not for production setup.

---

### File 3 to 14: Historical Legacy Scripts
- **Path**: `database/archive/*.sql`
- **Visual Label**: **`[DO NOT RUN — LEGACY / OBSOLETE]`**
- **Classification**: **F. LEGACY / OBSOLETE — DO NOT RUN**
- **List of Archived Files**:
  1. `database/archive/001_core_schema.sql` (v1.0 prototype)
  2. `database/archive/001_initial_schema.sql` (v2.0 prototype)
  3. `database/archive/002_functions_and_security.sql` (v2.1 superseded functions)
  4. `database/archive/002_seed_demo_data.sql` (old demo data)
  5. `database/archive/003_storage_setup.sql` (old storage draft)
  6. `database/archive/004_master_supabase_schema.sql` (v4.0 old schema)
  7. `database/archive/004_production_seed_data.sql` (old seed script)
  8. `database/archive/eleven_nation_complete_master_schema.sql` (v5.0 revision)
  9. `database/archive/eleven_nation_v4_to_v7.2.0_migration.sql` (v4 migration for non-existent database)
  10. `database/archive/eleven_nation_v7.2.0_fresh.sql` (v7.2 draft)
  11. `database/archive/v4_to_v7_0_complete_migration.sql` (v7.0 migration for non-existent database)
  12. `database/archive/v7_2_0_test_suite.sql` (superseded test suite)
- **Should Any Be Executed?**: **NO.**
- **Risk Level**: **CRITICAL.** Outdated schemas with verified defects that were resolved in the master release.

---

## 3. Recommended Execution Order for Future Database Changes

When new features are added in the upcoming **Backend & Admin Panel Phase**, follow this strict workflow:

```text
Step 1: Check database/02_SQL_EDITOR_EXECUTION/
        └── Only run numbered scripts (e.g. 001_admin_audit_enhancement.sql)
            marked explicitly with [RUN IN SUPABASE SQL EDITOR].

Step 2: Read the script header for prerequisites and description.

Step 3: Execute in Supabase SQL Editor:
        - Open Supabase Dashboard > SQL Editor > New Query
        - Paste the exact script contents
        - Click Run (Cmd/Ctrl + Enter)

Step 4: Verify query result shows "Success. No rows returned" or expected count.
```

---

## 4. Summary Checklist for User

- [x] Supabase Main Database initialized and preserved.
- [x] No SQL execution required for frontend stabilization.
- [x] All legacy SQL safely moved to `database/archive/`.
- [x] Test scripts isolated in `database/04_TESTS/`.
- [x] Master architecture secured in `database/01_EXISTING_DATABASE/`.
