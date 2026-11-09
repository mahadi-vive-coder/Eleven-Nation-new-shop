# ELEVEN NATION (elevennation.shop) — DEPLOYMENT GUIDE (v7.2.0)

## Overview
This document guides technical personnel through the deployment of the Eleven Nation production architecture.

---

## 1. Fresh Supabase Project Deployment

### Prerequisites:
- A newly provisioned Supabase project (PostgreSQL 15+).
- Project URL, Anon Key, and Service Role Key from **Project Settings** → **API**.

### Step-by-Step Instructions:
1. Open the Supabase Dashboard and go to **SQL Editor**.
2. Open `/database/sql/eleven_nation_v7.2.0_fresh.sql`.
3. Paste the entire SQL script into the query editor and click **RUN**.
4. Confirm in the output panel: `Query returned successfully`.
5. Run the post-installation secrets setup:
   ```sql
   CALL configure_system_secrets(
       'YOUR_MINIMUM_32_CHAR_RANDOM_HIGH_ENTROPY_PEPPER_STRING_HERE',
       'your_steadfast_api_key',
       'your_steadfast_secret_key',
       'your_steadfast_webhook_secret'
   );
   ```
6. Sign up your first admin user via the Next.js frontend or Supabase Auth Dashboard (`auth.users`).
7. Promote the signed-up user to Super Admin:
   ```sql
   CALL bootstrap_super_admin('your-admin-email@elevennation.shop');
   ```

---

## 2. Environment Variables Setup

Configure the following variables in your Next.js hosting environment (e.g., Vercel, Google Cloud Run):

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
RATE_LIMIT_PEPPER="your_32_char_minimum_pepper"
CRON_SECRET="your_high_entropy_cron_secret"
STEADFAST_API_KEY="your_steadfast_api_key"
STEADFAST_SECRET_KEY="your_steadfast_secret_key"
STEADFAST_WEBHOOK_SECRET="your_steadfast_webhook_secret"
```

---

## 3. Storage Bucket Verification

Verify that the following buckets exist in **Storage** in the Supabase Dashboard:
- `product-images` (Public: Yes)
- `banner-images` (Public: Yes)
- `avatar-images` (Public: Yes)
- `site-assets` (Public: Yes)
- `invoices` (Public: **No**, Private bucket)

---

## 4. Cron Worker Setup

Set up a scheduled HTTP task (e.g., via Vercel Cron or Google Cloud Scheduler) to invoke the invoice processor every 2 minutes:
- **Endpoint**: `POST https://elevennation.shop/api/cron/process-invoices`
- **Header**: `Authorization: Bearer <CRON_SECRET>`
