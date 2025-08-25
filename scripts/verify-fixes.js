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
  console.log('🔧 Verifying Fixes\n');
  
  // Test 1: Chat API (should never 500)
  console.log('1️⃣ Testing Chat API (resilient)...');
  const chat = await test('/api/chat', 'POST', {
    restaurantId: 'demo',
    sessionToken: 'test',
    message: 'Italian dishes?'
  });
  
  // Test 2: Orders API - Dine-in (should return orderCode)
  console.log('\n2️⃣ Testing Orders API - Dine-in...');
  const dineIn = await test('/api/orders', 'POST', {
    restaurantId: 'demo',
    sessionToken: 'test',
    type: 'dine_in',
    items: [{ itemId: '1', qty: 1 }]
  });
  
  // Test 3: Orders API - Pickup (should return internal checkout URL)
  console.log('\n3️⃣ Testing Orders API - Pickup...');
  const pickup = await test('/api/orders', 'POST', {
    restaurantId: 'demo',
    sessionToken: 'test',
    type: 'pickup',
    items: [{ itemId: '1', qty: 1 }]
  });
  
  console.log('\n📊 Results:');
  console.log('===========');
  console.log(`Chat API: ${chat.ok ? '✅ Working' : '❌ Failed'}`);
  console.log(`Dine-in: ${dineIn.ok ? '✅ Working' : '❌ Failed'}`);
  console.log(`Pickup: ${pickup.ok ? '✅ Working' : '❌ Failed'}`);
  
  if (chat.ok && dineIn.ok && pickup.ok) {
    console.log('\n🎉 All fixes working!');
    console.log(`📋 Dine-in Order Code: ${dineIn.data.orderCode}`);
    console.log(`🔗 Pickup Checkout URL: ${pickup.data.checkoutUrl}`);
    
    // Check if pickup URL is internal (not example.com)
    if (pickup.data.checkoutUrl.includes('/dev/checkout')) {
      console.log('✅ Pickup URL is internal (no more Example Domain!)');
    } else {
      console.log('❌ Pickup URL still external - check for leftover example.com references');
    }
    
    console.log('\n🚀 Ready for end-to-end testing!');
    console.log('1. Deploy to Vercel');
    console.log('2. Test pickup: visit the checkout URL');
    console.log('3. Click "Pay now (simulate)" to get PIN');
  } else {
    console.log('\n❌ Some fixes still need work');
  }
}

main().catch(err => {
  console.error('💥 Verification failed:', err);
});
