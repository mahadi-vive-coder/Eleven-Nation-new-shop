# ELEVEN NATION — DATABASE ARCHITECTURE & ORGANIZATION

## Current Status: Supabase Main Database Initialized & Preserved
**DO NOT REINITIALIZE OR RUN MASTER SQL AGAIN ON THE ACTIVE DATABASE.**

---

## 1. Directory Structure

```text
database/
├── README.md                      # This directory guide
├── EXECUTION_ORDER.md             # Visual execution guide for Supabase SQL Editor
├── ER_DIAGRAM.md                  # Entity relationship model and relational links
│
├── 01_EXISTING_DATABASE/          # The authoritative master schema
│   ├── README.md                  # [DO NOT RUN — ALREADY APPLIED]
│   └── eleven_nation_final_fresh_install.sql
│
├── 02_SQL_EDITOR_EXECUTION/       # Incremental future migration scripts
│   └── README.md                  # CURRENT ACTION: NO SQL EXECUTION REQUIRED
│
├── 03_OPTIONAL_SQL/               # Auxiliary feature scripts (buckets, optional seeds)
│   └── README.md                  # [OPTIONAL — RUN ONLY WHEN NEEDED]
│
├── 04_TESTS/                      # Automated verification and SQL test suites
│   ├── README.md                  # [TEST ONLY — NOT FOR PRODUCTION]
│   ├── TEST_REPORT.md             # Verification records
│   └── final_fresh_install_test_suite.sql
│
├── 05_EDGE_FUNCTIONS/             # Server-authoritative Edge Function contracts
│   └── README.md                  # Steadfast dispatch, webhook & invoice specifications
│
└── archive/                       # Archived historical legacy SQL iterations
    ├── README.md                  # [DO NOT RUN — LEGACY / OBSOLETE]
    └── *.sql                      # Superseded v1–v7.2 prototypes and drafts
```

---

## 2. Core Rules for Supabase Administration

1. **The Active Database is Live**:
   The active Supabase database has been initialized with the 27 tables, triggers, and functions from `database/01_EXISTING_DATABASE/eleven_nation_final_fresh_install.sql`.
2. **Never Re-run Master SQL**:
   Never run `eleven_nation_final_fresh_install.sql` again on your active database.
3. **Execution Order Guide**:
   Always consult `database/EXECUTION_ORDER.md` before executing any query in Supabase SQL Editor.
4. **Current Action**:
   **NO SQL EXECUTION REQUIRED.** All frontend services connect seamlessly to the existing database schema.
