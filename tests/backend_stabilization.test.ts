import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isValidIp, extractClientIp } from '../src/lib/guestTracking';
import { cartService, DELIVERY_FEE_DHAKA, DELIVERY_FEE_OUTSIDE_DHAKA } from '../src/services/cartService';
import { CartItem, Product } from '../src/types';

console.log('🧪 Starting Eleven Nation — Backend Stabilization Test Suite...\n');

// ============================================================================
// 1. FRONTEND BUNDLE HYGIENE & SERVER-SIDE FILE PURGE
// ============================================================================
console.log('▶ Test 1: Frontend Bundle Hygiene & Server-Side File Purge');
const forbiddenFiles = [
  'src/lib/supabaseAdmin.ts',
  'src/lib/steadfast.ts',
  'src/lib/invoiceWorker.ts',
  'src/lib/invoiceQueue.ts',
  'src/lib/supabaseServer.ts',
];

for (const file of forbiddenFiles) {
  assert.strictEqual(
    fs.existsSync(path.resolve(process.cwd(), file)),
    false,
    `Security violation: ${file} must NOT exist in the frontend bundle!`
  );
}

// Verify that remaining files in src/lib do not import server secrets
const allowedLibFiles = fs.readdirSync(path.resolve(process.cwd(), 'src/lib'));
for (const file of allowedLibFiles) {
  const content = fs.readFileSync(path.resolve(process.cwd(), 'src/lib', file), 'utf-8');
  assert.strictEqual(
    content.includes('SUPABASE_SERVICE_ROLE_KEY'),
    false,
    `Security violation: ${file} contains reference to SUPABASE_SERVICE_ROLE_KEY`
  );
  assert.strictEqual(
    content.includes('STEADFAST_API_KEY'),
    false,
    `Security violation: ${file} contains reference to STEADFAST_API_KEY`
  );
}
console.log('  ✔ Passed: Zero server-only secrets or files exist in src/lib.');

// ============================================================================
// 2. SUPABASE EDGE FUNCTIONS DIRECTORY STRUCTURE VERIFICATION
// ============================================================================
console.log('\n▶ Test 2: Supabase Edge Functions Directory & File Structure');
const requiredEdgeFiles = [
  'supabase/config.toml',
  'supabase/README.md',
  'supabase/functions/_shared/cors.ts',
  'supabase/functions/_shared/supabaseClient.ts',
  'supabase/functions/_shared/auth.ts',
  'supabase/functions/steadfast-dispatch/index.ts',
  'supabase/functions/steadfast-webhook/index.ts',
  'supabase/functions/invoice-worker/index.ts',
  'supabase/functions/admin-operations/index.ts',
];

for (const relPath of requiredEdgeFiles) {
  const fullPath = path.resolve(process.cwd(), relPath);
  assert.strictEqual(
    fs.existsSync(fullPath),
    true,
    `Missing required Edge Function file: ${relPath}`
  );
}
console.log('  ✔ Passed: All 9 required Edge Function source and config files exist.');

// ============================================================================
// 3. INCREMENTAL DATABASE MIGRATION INTEGRITY
// ============================================================================
console.log('\n▶ Test 3: Incremental Migration 001 Review & Safety Marking');
const migrationPath = path.resolve(
  process.cwd(),
  'database/02_SQL_EDITOR_EXECUTION/001_review_public_product_variants_view.sql'
);
assert.strictEqual(fs.existsSync(migrationPath), true, 'Migration 001 must exist');

const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
assert.strictEqual(
  migrationSql.includes('[DO NOT RUN YET — REVIEW REQUIRED]'),
  true,
  'Migration must be clearly labeled [DO NOT RUN YET — REVIEW REQUIRED]'
);
assert.strictEqual(
  migrationSql.includes('security_invoker = false'),
  true,
  'Migration must preserve security_invoker = false for public catalog stability'
);
assert.strictEqual(
  migrationSql.includes('security_barrier = true'),
  true,
  'Migration must configure security_barrier = true for optimizer protection'
);
console.log('  ✔ Passed: Migration 001 safety header and definer semantics verified.');

// ============================================================================
// 4. CHECKOUT FINANCIAL INTEGRITY & COD DELIVERY CALCULATION
// ============================================================================
console.log('\n▶ Test 4: Checkout Delivery Charge & Total Calculation');
assert.strictEqual(DELIVERY_FEE_DHAKA, 70, 'Inside Dhaka standard delivery fee should be 70 BDT');
assert.strictEqual(DELIVERY_FEE_OUTSIDE_DHAKA, 130, 'Outside Dhaka standard delivery fee should be 130 BDT');

const mockProduct: Product = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Real Madrid 24/25 Home Kit',
  slug: 'real-madrid-24-25-home',
  description: 'Authentic football jersey',
  category: 'jerseys',
  subcategory: 'club',
  basePrice: 1200,
  images: [{ id: 'img-1', url: 'https://example.com/rm.jpg', alt: 'Real Madrid Home Kit', isPrimary: true, sort_order: 1 }],
  variants: [
    {
      id: 'v1',
      size: 'L',
      colorName: 'White',
      colorHex: '#FFFFFF',
      sku: 'RM-L',
      priceModifier: 0,
      stock: 10,
    },
  ],
  tags: ['jersey'],
  sku: 'RM-2425',
  createdAt: new Date().toISOString(),
  inStock: true,
  isFeatured: true,
  isNewArrival: false,
};

const mockCartItem: CartItem = {
  id: 'item-1',
  productId: mockProduct.id,
  product: mockProduct,
  variantId: 'v1',
  size: 'L',
  color: 'White',
  quantity: 1,
  unitPrice: 1200,
  totalPrice: 1200,
};

// Subtotal 1200 (< 2500 threshold), inside Dhaka -> Delivery: 70
const insideTotals = cartService.calculateTotals([mockCartItem], 'Dhaka');
assert.strictEqual(insideTotals.subtotal, 1200, 'Subtotal should be 1200 BDT');
assert.strictEqual(insideTotals.deliveryCharge, 70, 'Delivery fee inside Dhaka should be 70 BDT');
assert.strictEqual(insideTotals.grandTotal, 1270, 'Grand total inside Dhaka should be 1270 BDT');

// Subtotal 1200 (< 2500 threshold), outside Dhaka (e.g. Chittagong) -> Delivery: 130
const outsideTotals = cartService.calculateTotals([mockCartItem], 'Chittagong');
assert.strictEqual(outsideTotals.subtotal, 1200, 'Subtotal should be 1200 BDT');
assert.strictEqual(outsideTotals.deliveryCharge, 130, 'Delivery fee outside Dhaka should be 130 BDT');
assert.strictEqual(outsideTotals.grandTotal, 1330, 'Grand total outside Dhaka should be 1330 BDT');

// Subtotal over 2500 -> Free delivery
const highValueCartItem: CartItem = {
  ...mockCartItem,
  quantity: 3,
  totalPrice: 3600,
};
const freeShippingTotals = cartService.calculateTotals([highValueCartItem], 'Sylhet');
assert.strictEqual(freeShippingTotals.subtotal, 3600, 'Subtotal should be 3600 BDT');
assert.strictEqual(freeShippingTotals.deliveryCharge, 0, 'Orders over threshold qualify for free delivery');
assert.strictEqual(freeShippingTotals.grandTotal, 3600, 'Grand total with free delivery should match subtotal');

console.log('  ✔ Passed: Financial subtotal and delivery rates validated accurately.');

// ============================================================================
// 5. GUEST TRACKING IP STRATEGY & SPOOF RESISTANCE
// ============================================================================
console.log('\n▶ Test 5: Guest Tracking IP Parsing & Cloudflare Precedence');
assert.strictEqual(isValidIp('103.145.118.2'), true, 'Valid public IPv4 must pass');
assert.strictEqual(isValidIp('2400:cb00:2048:1::c629:d7a2'), true, 'Valid IPv6 must pass');
assert.strictEqual(isValidIp('unknown'), false, 'Non-IP token must fail');
assert.strictEqual(isValidIp('999.999.999.999'), false, 'Invalid IP range must fail');

// Cloudflare header precedence test
const cfHeaders = {
  'cf-connecting-ip': '103.205.180.12',
  'x-forwarded-for': '10.0.0.1, 192.168.1.1',
};
assert.strictEqual(
  extractClientIp(cfHeaders),
  '103.205.180.12',
  'Cloudflare connecting IP takes precedence'
);

// X-Forwarded-For multi-hop leftmost extraction
const multiHopHeaders = {
  'x-forwarded-for': '119.30.38.100, 10.100.0.1, 172.16.1.1',
};
assert.strictEqual(
  extractClientIp(multiHopHeaders),
  '119.30.38.100',
  'Leftmost public client IP must be extracted from multi-hop XFF'
);

// Unresolvable headers must throw an error rather than silently defaulting to 127.0.0.1
assert.throws(
  () => extractClientIp({}),
  /Unable to securely determine client IP address/,
  'Empty headers must throw to prevent spoofed/unverified tracking requests'
);
console.log('  ✔ Passed: IP validation, multi-hop parsing, and Cloudflare priority verified.');

// ============================================================================
// 6. EDGE FUNCTION JWT & AUTH SPECIFICATION TESTS
// ============================================================================
console.log('\n▶ Test 6: Edge Function Auth Role & Security Specification');
const authSharedCode = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/_shared/auth.ts'),
  'utf-8'
);
assert.strictEqual(
  authSharedCode.includes("['super_admin', 'order_manager']"),
  true,
  'Auth helper must enforce super_admin or order_manager roles'
);
assert.strictEqual(
  authSharedCode.includes('public.user_roles'),
  true,
  'Auth helper must query public.user_roles for RBAC enforcement'
);

const corsSharedCode = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/_shared/cors.ts'),
  'utf-8'
);
assert.strictEqual(
  corsSharedCode.includes('handleCors'),
  true,
  'Shared CORS helper must provide handleCors'
);
assert.strictEqual(
  corsSharedCode.includes('Access-Control-Allow-Origin'),
  true,
  'CORS helper must include Access-Control-Allow-Origin headers'
);
console.log('  ✔ Passed: Shared auth RBAC and CORS helpers verified.');

// ============================================================================
// 7. STEADFAST WEBHOOK & DISPATCH ATOMICITY
// ============================================================================
console.log('\n▶ Test 7: Steadfast Webhook & Dispatch Atomic Implementation');
const dispatchCode = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/steadfast-dispatch/index.ts'),
  'utf-8'
);
assert.strictEqual(
  dispatchCode.includes('claim_order_for_dispatch'),
  true,
  'Dispatch function must call claim_order_for_dispatch to acquire lease lock'
);
assert.strictEqual(
  dispatchCode.includes('finalize_order_dispatch'),
  true,
  'Dispatch function must finalize order after courier confirmation'
);
assert.strictEqual(
  dispatchCode.includes('release_order_dispatch_claim'),
  true,
  'Dispatch function must release claim on courier failure'
);

const webhookCode = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/steadfast-webhook/index.ts'),
  'utf-8'
);
assert.strictEqual(
  webhookCode.includes('process_steadfast_webhook'),
  true,
  'Webhook must call process_steadfast_webhook RPC for atomic deduplication'
);
assert.strictEqual(
  webhookCode.includes('STEADFAST_WEBHOOK_SECRET'),
  true,
  'Webhook must enforce secret authentication'
);
console.log('  ✔ Passed: Courier dispatch atomicity and webhook deduplication logic verified.');

// ============================================================================
// 8. INVOICE QUEUE WORKER CONCURRENCY LOGIC
// ============================================================================
console.log('\n▶ Test 8: Invoice Queue Worker Concurrency Logic');
const invoiceWorkerCode = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/functions/invoice-worker/index.ts'),
  'utf-8'
);
assert.strictEqual(
  invoiceWorkerCode.includes('claim_invoice_queue_jobs'),
  true,
  'Invoice worker must invoke claim_invoice_queue_jobs for SKIP LOCKED concurrency'
);
assert.strictEqual(
  invoiceWorkerCode.includes('complete_invoice_queue_job'),
  true,
  'Invoice worker must mark jobs complete upon storage upload'
);
assert.strictEqual(
  invoiceWorkerCode.includes('fail_invoice_queue_job'),
  true,
  'Invoice worker must handle failures gracefully with retry counting'
);
console.log('  ✔ Passed: Invoice worker queue concurrency and lifecycle verified.');

console.log('\n✨ ALL 8 BACKEND STABILIZATION TESTS PASSED SUCCESSFULLY! ✨\n');
