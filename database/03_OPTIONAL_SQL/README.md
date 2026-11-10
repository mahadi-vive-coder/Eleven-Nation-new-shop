# 03 — OPTIONAL SQL SCRIPTS

## [OPTIONAL — RUN ONLY WHEN NEEDED]

### Purpose
This directory holds optional SQL scripts for features, auxiliary services, or storage bucket definitions that are not required for core customer store operations.

---

### Scripts Catalog

| Script | Purpose | When to Run | Risk Level |
| :--- | :--- | :--- | :--- |
| `001_storage_buckets.sql` *(Reference)* | Creates Supabase Storage buckets (`product-images`, `banners`, `invoices`, `avatars`) if not already created in Supabase Dashboard. | Run **only** if image upload buckets are missing in the Supabase Storage Dashboard. | Low |
| `002_sample_catalog_seed.sql` *(Reference)* | Optional seed products for demo or development purposes. | Run **only** on a staging or development database if you wish to pre-fill test catalog items. | Low (Inserts data) |

---

### Guidelines
- **Do not run these scripts blindly.**
- Storage buckets can also be created with a few clicks directly in the Supabase Dashboard under `Storage > New Bucket`.
- If your store already has live images and products, **do not execute seed scripts**.
