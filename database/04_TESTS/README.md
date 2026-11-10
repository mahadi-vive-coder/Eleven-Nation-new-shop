# 04 — DATABASE TEST SUITE

## [TEST ONLY — NOT FOR PRODUCTION]

### Critical Warning
**NEVER run test scripts as production setup or on a live production database with customer data.**

Test scripts insert mock orders, test edge cases, and run rollbacks that can pollute production tables or reset sequence IDs.

---

### Files in this Directory
1. **`final_fresh_install_test_suite.sql`**:
   - **Classification**: **D. TEST ONLY — NEVER RUN AS PRODUCTION SETUP**
   - **Purpose**: Validates database triggers, RLS policies, courier dispatch lease mechanics, append-only guarantees, and checkout atomicity.
   - **Environment**: Designed strictly for transient CI/CD testing or isolated staging database environments.
2. **`TEST_REPORT.md`**:
   - Contains historical verification logs and test execution results.
