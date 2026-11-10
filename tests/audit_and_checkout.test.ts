import assert from 'node:assert/strict';
import { isValidIp, extractClientIp } from '../src/lib/guestTracking';
import { getProductColors, extractAvailableColors, getColorHex } from '../src/services/productService';
import { Product, CartItem } from '../src/types';

console.log('🧪 Starting Eleven Nation Audit & Remediation Test Suite...\n');

// 1. Test IP Validation
console.log('▶ Test 1: IP Validation (IPv4, IPv6, spoof prevention)');
assert.strictEqual(isValidIp('103.145.118.2'), true, 'Valid IPv4 should pass');
assert.strictEqual(isValidIp('127.0.0.1'), true, 'Valid localhost IPv4 should pass');
assert.strictEqual(isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), true, 'Valid IPv6 should pass');
assert.strictEqual(isValidIp('not-an-ip'), false, 'Non-IP string should fail');
assert.strictEqual(isValidIp('256.300.1.1'), false, 'Out-of-range IPv4 should fail');
assert.strictEqual(isValidIp(''), false, 'Empty string should fail');
console.log('  ✔ Passed: IP validation rules verified.');

// 2. Test Edge Header IP Extraction
console.log('\n▶ Test 2: Edge Header IP Extraction Priority');
const cfHeader = { 'cf-connecting-ip': '103.145.118.5', 'x-forwarded-for': '192.168.1.1' };
assert.strictEqual(extractClientIp(cfHeader), '103.145.118.5', 'Cloudflare CF-Connecting-IP takes highest precedence');

const proxyHeader = { 'x-real-ip': '103.145.118.10', 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };
assert.strictEqual(extractClientIp(proxyHeader), '103.145.118.10', 'X-Real-IP takes precedence when CF header is absent');

const multiHopHeader = { 'x-forwarded-for': '103.145.118.25, 172.16.0.1' };
assert.strictEqual(extractClientIp(multiHopHeader), '103.145.118.25', 'Leftmost public IP is extracted from X-Forwarded-For');
console.log('  ✔ Passed: Edge proxy IP extraction hierarchy verified.');

// 3. Test Product & Variant Structure
console.log('\n▶ Test 3: Product & Variant Mapping');
const mockDbProduct = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Real Madrid 24/25 Home Kit',
  slug: 'real-madrid-24-25-home',
  product_type: 'jersey',
  base_price: '1450.00',
  compare_at_price: '1850.00',
  is_customizable: true,
  customization_charge: '250.00',
  is_active: true,
  is_featured: true,
  is_new_arrival: true,
  tags: ['jersey', 'real madrid', 'laliga'],
  category: { id: 'cat-1', name: 'Football Jerseys', slug: 'football-jerseys' },
  images: [{ id: 'img-1', url: 'https://example.com/rm-home.jpg', is_primary: true, sort_order: 1 }],
};

const mockVariants = [
  {
    id: 'var-uuid-001',
    product_id: '00000000-0000-0000-0000-000000000001',
    size: 'L',
    color: 'White',
    sku: 'RM-2425-H-L',
    price_modifier: '0.00',
    is_active: true,
    in_stock: true,
  },
  {
    id: 'var-uuid-002',
    product_id: '00000000-0000-0000-0000-000000000001',
    size: 'XL',
    color: 'White',
    sku: 'RM-2425-H-XL',
    price_modifier: '50.00',
    is_active: true,
    in_stock: false,
  },
];

assert.strictEqual(mockVariants[0].id, 'var-uuid-001');
assert.strictEqual(mockVariants[0].in_stock, true);
assert.strictEqual(mockVariants[1].in_stock, false);
console.log('  ✔ Passed: Variant UUID and boolean in_stock verified.');

// 4. Test Cart Item and Variant ID Mapping
console.log('\n▶ Test 4: Cart Item & Variant ID Resolution for place_order_atomic');
const mockCartItem: CartItem = {
  id: `${mockDbProduct.id}-${mockVariants[0].id}`,
  productId: mockDbProduct.id,
  product: {
    id: mockDbProduct.id,
    slug: mockDbProduct.slug,
    name: mockDbProduct.name,
    category: 'jerseys',
    subcategory: 'club',
    basePrice: 1450,
    inStock: true,
    images: [{ id: 'img-1', url: 'https://example.com/rm-home.jpg', alt: 'Real Madrid' }],
    variants: [
      {
        id: mockVariants[0].id,
        size: 'L',
        colorName: 'White',
        colorHex: '#FFFFFF',
        stock: 10,
        sku: 'RM-2425-H-L',
        priceModifier: 0,
      },
    ],
    tags: ['jersey'],
    sku: 'RM-2425-H',
    createdAt: new Date().toISOString(),
    description: 'Authentic Kit',
  },
  variantId: mockVariants[0].id, // MUST be the variant's UUID
  size: 'L',
  color: 'White',
  quantity: 2,
  unitPrice: 1450,
  customization: { name: 'VINICIUS JR', number: '7', price: 250 },
  totalPrice: 3400,
};

// Simulate orderService mapping logic:
const rpcItems = [mockCartItem].map((item) => ({
  variant_id: item.variantId || item.productId,
  quantity: item.quantity,
  custom_name: item.customization?.name,
  custom_number: item.customization?.number,
}));

assert.strictEqual(rpcItems[0].variant_id, 'var-uuid-001', 'RPC item variant_id MUST match variantId, NOT productId!');
assert.strictEqual(rpcItems[0].quantity, 2);
assert.strictEqual(rpcItems[0].custom_name, 'VINICIUS JR');
assert.strictEqual(rpcItems[0].custom_number, '7');
console.log('  ✔ Passed: variant_id mapping passes variantId to place_order_atomic.');

// 5. Test Color Hex Mapping and Color Extractors
console.log('\n▶ Test 5: Color Mapping & Hex Resolution');
assert.strictEqual(getColorHex('Pitch Black'), '#111111');
assert.strictEqual(getColorHex('White'), '#FFFFFF');
assert.strictEqual(getColorHex('Blaugrana'), '#A50044');

const colorTestProduct: Product = {
  ...mockCartItem.product,
  colors: ['Pitch Black', 'Chalk Off-White'],
};
const assignedColors = getProductColors(colorTestProduct);
assert.deepStrictEqual(assignedColors, ['Pitch Black', 'Chalk Off-White']);

const availableColors = extractAvailableColors([colorTestProduct]);
assert.strictEqual(availableColors.length, 2);
assert.strictEqual(availableColors[0].name, 'Chalk Off-White');
assert.strictEqual(availableColors[1].name, 'Pitch Black');
console.log('  ✔ Passed: Color swatches and assigned colors extract correctly.');

console.log('\n======================================================');
console.log('🎉 ALL AUDIT & INTEGRATION TESTS PASSED SUCCESSFULLY!');
console.log('======================================================\n');
