#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || 'https://resturant-two-xi.vercel.app';

async function test(endpoint, method = 'GET', body = null) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    const ms = Date.now() - t0;
    
    if (res.ok) {
      console.log(`✅ ${method} ${endpoint} (${ms}ms)`);
      return { ok: true, data, status: res.status };
    } else {
      console.log(`❌ ${method} ${endpoint} - ${res.status}: ${data.error || 'Unknown error'}`);
      return { ok: false, error: data.error, status: res.status };
    }
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`💥 ${method} ${endpoint} - Network error: ${err.message} (${ms}ms)`);
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('🚀 Quick Smoke Test for P0 Flow\n');
  
  // Test 1: Health check
  const health = await test('/api/health');
  if (!health.ok) {
    console.log('\n❌ Health check failed - stopping tests');
    process.exit(1);
  }
  
  // Test 2: Menu API (using a real restaurant ID)
  const menu = await test('/api/public/menu?restaurantId=64806e5b-714f-4388-a092-29feff9b64c0');
  if (!menu.ok) {
    console.log('\n❌ Menu API failed - stopping tests');
    process.exit(1);
  }
  
  // Test 3: Chat API
  const chat = await test('/api/chat', 'POST', {
    restaurantId: '64806e5b-714f-4388-a092-29feff9b64c0',
    sessionToken: 'smoke-test',
    message: 'Italian dishes?'
  });
  if (!chat.ok) {
    console.log('\n❌ Chat API failed - stopping tests');
    process.exit(1);
  }
  
  // Test 4: Create order
  const order = await test('/api/orders', 'POST', {
    restaurantId: '64806e5b-714f-4388-a092-29feff9b64c0', // Use a real UUID
    sessionToken: 'smoke-test',
    type: 'pickup',
    items: [{ itemId: '1', qty: 1 }], // Real item ID from menu
    customer: { name: 'Test User', phone: '+1234567890' }
  });
  if (!order.ok) {
    console.log('\n❌ Order creation failed - stopping tests');
    process.exit(1);
  }
  
  const orderId = order.data.id;
  
  // Test 5: Mark paid (dev endpoint)
  const markPaid = await test('/api/dev/mark-paid', 'POST', { orderId });
  if (!markPaid.ok) {
    console.log('\n❌ Mark paid failed - stopping tests');
    process.exit(1);
  }
  
  console.log('\n🎉 All P0 endpoints working!');
  console.log(`📋 Order ID: ${orderId}`);
  console.log(`🔢 PIN: ${markPaid.data.pin}`);
  console.log('\n✅ Ready for end-to-end pickup flow testing');
}

main().catch(err => {
  console.error('💥 Test runner failed:', err);
  process.exit(1);
});
