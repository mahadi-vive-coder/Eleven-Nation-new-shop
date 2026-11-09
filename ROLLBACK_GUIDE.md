# ELEVEN NATION (elevennation.shop) — ROLLBACK GUIDE (v7.2.0)

## Overview
This document outlines the emergency rollback procedure if issues occur during or after deploying version 7.2.0.

---

## 1. Migration Transaction Rollback
The migration script `/database/migrations/eleven_nation_v4_to_v7.2.0_migration.sql` runs entirely within a PostgreSQL transaction (`BEGIN ... COMMIT`).
If any statement errors during execution, PostgreSQL rolls back all schema modifications automatically.

---

## 2. Emergency Point-in-Time Database Restore
If a rollback is required after a completed migration:
1. Access the Supabase Dashboard → **Database** → **Backups**.
2. Select the backup snapshot taken prior to migration and click **Restore**.
3. Via command line:
   ```bash
   psql -h db.your-supabase-id.supabase.co -U postgres -d postgres -f pre_v720_backup.sql
   ```

---

## 3. Reverting Non-Destructive Table Additions
If you wish to roll back the schema without restoring from backup:
```sql
BEGIN;

DROP TABLE IF EXISTS public.courier_dispatch_claims CASCADE;
DROP TABLE IF EXISTS public.courier_webhook_events CASCADE;
DROP TABLE IF EXISTS public.invoice_generation_queue CASCADE;
DROP TABLE IF EXISTS public.checkout_idempotency_keys CASCADE;
DROP TABLE IF EXISTS public.guest_tracking_rate_limits CASCADE;
DELETE FROM public.schema_migrations WHERE version = '7.2.0';

COMMIT;
```
Existing customers, products, variants, and orders remain intact.
