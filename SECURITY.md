# ELEVEN NATION — Security Architecture & Guidelines

This document details the security model, authorization controls, and future Supabase security specifications for the **ELEVEN NATION** platform.

---

## 1. Core Security Principles

1. **Zero Client Trust for Financial Data**:
   - The customer website must never be trusted for product prices, discounts, subtotal calculations, or stock deductions.
   - When placing orders, the client sends only `variant_id`, `quantity`, and customization parameters. A trusted server-side function (Supabase Edge Function) queries the database to recalculate the actual order total and verify stock availability before recording the order.
2. **Never Expose Secret Credentials**:
   - The Supabase `service_role` secret key must **NEVER** appear in client-side code, git repositories, or `.env` files distributed to the browser.
   - The client application exclusively uses the public `anon` key (`VITE_SUPABASE_ANON_KEY`), protected by database Row Level Security.
3. **Strict Separation of Application Concerns**:
   - The customer application (`elevennation.shop`) is strictly read-only for administrative tables.
   - Administrative dashboards and management tools live in a completely separate deployment and require elevated role credentials.

---

## 2. Row Level Security (RLS) Model

Every table in the database has Row Level Security enabled. Key rules:

| Table | Anonymous / Public | Authenticated Customer | Admin / Manager |
| :--- | :--- | :--- | :--- |
| `profiles` | Denied | Read/Update Own Profile | Read All |
| `user_roles` | Denied | Read Own Role | Full Control |
| `categories` | Read Active | Read Active | Full Control |
| `banners` | Read Active in Schedule | Read Active in Schedule | Full Control |
| `products` | Read Active | Read Active | Full Control |
| `product_variants` | Read All | Read All | Full Control |
| `product_images` | Read All | Read All | Full Control |
| `addresses` | Denied | Full Control of Own Addresses | Read All |
| `orders` | Track via RPC (masked) | Read Own Orders | Full Control |
| `order_items` | Track via RPC (masked) | Read Items of Own Orders | Full Control |
| `site_settings` | Read All | Read All | Full Control |

---

## 3. Prevention of Privilege Escalation

- User roles are stored in a separate table `user_roles`, **NOT** inside user metadata or the `profiles` table.
- RLS policies on `user_roles` permit users only to `SELECT` their own roles. No user can `INSERT`, `UPDATE`, or `DELETE` records in `user_roles`.
- Administrative rights are verified via the security definer function `is_admin(user_id)`.

---

## 4. Storage Security Policies

Supabase Storage enforces granular bucket permissions:
- **`product-images`**: Public read. Upload/Update/Delete operations require `is_admin(auth.uid()) = TRUE`.
- **`banner-images`**: Public read. Upload/Update/Delete operations require `is_admin(auth.uid()) = TRUE`.
- **`avatar-images`**: Public read. Authenticated users can upload/update only within their own user ID folder (`(storage.foldername(name))[1] = auth.uid()::text`).

---

## 5. Secure Server-Side Order Creation (Phase 3 Workflow)

When transitioning from the current prototype demo checkout to live Supabase, the checkout workflow will execute via a secure Supabase Edge Function:

```text
[Customer Client] 
      │
      ▼ (Submits: cart items, delivery address, phone)
[Supabase Edge Function: create-order]
      │
      ├── 1. Validate phone number format (01XXXXXXXXX)
      ├── 2. Query products & product_variants for current DB prices
      ├── 3. Check variant stock (stock >= requested quantity)
      ├── 4. Recalculate subtotal, delivery fee (Dhaka ৳70 / BD ৳130), and grand total
      ├── 5. Transactionally INSERT into orders & order_items
      ├── 6. Deduct stock from product_variants
      └── 7. Log to inventory_movements & trigger confirmation SMS
```

This guarantees that malicious actors modifying client JavaScript or network payloads cannot purchase items at falsified rates.
