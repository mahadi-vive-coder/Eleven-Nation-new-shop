# ELEVEN NATION (elevennation.shop) — MIGRATION GUIDE (v4 to v7.2.0)

## Overview
This document guides technical personnel through the non-destructive upgrade of an existing Eleven Nation v4.x database to version 7.2.0.

---

## 1. Pre-Migration Checklist & Safety

1. **Create Full Database Snapshot**:
   In the Supabase Dashboard, navigate to **Database** → **Backups** and click **Create Backup**.
   Alternatively, via CLI:
   ```bash
   supabase db dump -f pre_v720_backup.sql
   ```
2. **Maintenance Notice**:
   If applying during live operation, ensure background dispatch jobs are paused.

---

## 2. Migration Execution

1. Open Supabase Dashboard **SQL Editor**.
2. Open `/database/migrations/eleven_nation_v4_to_v7.2.0_migration.sql`.
3. Paste the complete script and click **RUN**.
4. The migration script includes preflight checks that verify table existence and stop execution if prerequisites are not met.
5. The migration runs within a single `BEGIN ... COMMIT` block. If any error occurs, the database rolls back automatically.

---

## 3. Post-Migration Verification

1. Verify migration record:
   ```sql
   SELECT * FROM public.schema_migrations WHERE version = '7.2.0';
   ```
2. Execute the verification test suite:
   Run `/database/tests/v7_2_0_test_suite.sql` in the SQL Editor.
3. Configure the rate limiting pepper:
   ```sql
   CALL configure_system_secrets('YOUR_PEPPER_STRING_32_CHARS_MINIMUM');
   ```
