# ARCHIVE — LEGACY & SUPERSEDED SQL FILES

## [DO NOT RUN — LEGACY / OBSOLETE]

### Critical Warning
**DO NOT EXECUTE ANY SQL FILE IN THIS DIRECTORY.**

These files represent prior iterations, incremental migration drafts (v4, v5, v6, v7.0, v7.2), and early development prototypes. They are preserved strictly for historical record and compliance auditing.

---

### Archived Files Inventory

| Filename | Original Version | Classification | Why It Must Not Be Run |
| :--- | :--- | :--- | :--- |
| `001_core_schema.sql` | v1.0 | F. LEGACY / OBSOLETE | Superseded by the master architecture. |
| `001_initial_schema.sql` | v2.0 | F. LEGACY / OBSOLETE | Incomplete prototype schema. |
| `002_functions_and_security.sql` | v2.1 | F. LEGACY / OBSOLETE | Outdated security definer functions with privilege leak defects. |
| `002_seed_demo_data.sql` | v2.1 | F. LEGACY / OBSOLETE | Hardcoded mock data. |
| `003_storage_setup.sql` | v3.0 | F. LEGACY / OBSOLETE | Superseded storage setup. |
| `004_master_supabase_schema.sql` | v4.0 | F. LEGACY / OBSOLETE | Old schema lacking Steadfast courier dispatch locking. |
| `004_production_seed_data.sql` | v4.0 | F. LEGACY / OBSOLETE | Seed data with outdated foreign key references. |
| `eleven_nation_complete_master_schema.sql` | v5.0 | F. LEGACY / OBSOLETE | Earlier revision prior to strict order-status state machine. |
| `eleven_nation_v4_to_v7.2.0_migration.sql` | v7.2 Draft | F. LEGACY / OBSOLETE | Incremental migration for a legacy v4 database that does not exist in production. |
| `eleven_nation_v7.2.0_fresh.sql` | v7.2 Draft | F. LEGACY / OBSOLETE | Intermediate draft consolidated into `eleven_nation_final_fresh_install.sql`. |
| `v4_to_v7_0_complete_migration.sql` | v7.0 | F. LEGACY / OBSOLETE | Migration for pre-existing v4 databases. |
| `v7_2_0_test_suite.sql` | v7.2 Draft | F. LEGACY / OBSOLETE | Test suite superseded by `database/04_TESTS/final_fresh_install_test_suite.sql`. |
