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
  
  // Test 2: Status API
  const status = await test('/api/public/status?restaurantId=demo');
  if (!status.ok) {
    console.log('\n❌ Status API failed - stopping tests');
    process.exit(1);
  }
  
  // Test 3: Menu API
  const menu = await test('/api/public/menu?restaurantId=demo');
  if (!menu.ok) {
    console.log('\n❌ Menu API failed - stopping tests');
    process.exit(1);
  }
  
  // Test 4: Chat API
  const chat = await test('/api/chat', 'POST', {
    restaurantId: 'demo',
    sessionToken: 'smoke-test',
    message: 'Italian dishes?'
  });
  if (!chat.ok) {
    console.log('\n❌ Chat API failed - stopping tests');
    process.exit(1);
  }
  
  // Test 5: Orders API (dine-in)
  const orderDineIn = await test('/api/orders', 'POST', {
    restaurantId: 'demo',
    sessionToken: 'smoke-test',
    type: 'dine_in',
    items: [{ itemId: '1', qty: 1 }]
  });
  if (!orderDineIn.ok) {
    console.log('\n❌ Orders API (dine-in) failed - stopping tests');
    process.exit(1);
  }
  
  // Test 6: Orders API (pickup)
  const orderPickup = await test('/api/orders', 'POST', {
    restaurantId: 'demo',
    sessionToken: 'smoke-test',
    type: 'pickup',
    items: [{ itemId: '1', qty: 1 }]
  });
  if (!orderPickup.ok) {
    console.log('\n❌ Orders API (pickup) failed - stopping tests');
    process.exit(1);
  }
  
  console.log('\n🎉 All P0 endpoints working!');
  console.log(`📋 Dine-in Order: ${orderDineIn.data.orderCode}`);
  console.log(`🛒 Pickup Order: ${orderPickup.data.orderId}`);
  console.log(`🔗 Checkout URL: ${orderPickup.data.checkoutUrl}`);
  console.log('\n✅ Ready for end-to-end widget testing');
}

main().catch(err => {
  console.error('💥 Test runner failed:', err);
  process.exit(1);
});
