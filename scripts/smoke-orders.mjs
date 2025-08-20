#!/usr/bin/env node

// Smoke test for Stjarna API endpoints
// Usage: BASE=https://... RESTAURANT_UUID=... ITEM_UUID=... node scripts/smoke-orders.mjs

const BASE = process.env.BASE || 'http://localhost:3001';
const RESTAURANT_UUID = process.env.RESTAURANT_UUID;
const ITEM_UUID = process.env.ITEM_UUID;

if (!RESTAURANT_UUID || !ITEM_UUID) {
  console.error('❌ Missing required environment variables:');
  console.error('  RESTAURANT_UUID:', RESTAURANT_UUID ? '✅' : '❌');
  console.error('  ITEM_UUID:', ITEM_UUID ? '✅' : '❌');
  console.error('  BASE:', BASE);
  process.exit(1);
}

console.log('🧪 Stjarna Smoke Tests');
console.log('=====================');
console.log(`Base URL: ${BASE}`);
console.log(`Restaurant: ${RESTAURANT_UUID}`);
console.log(`Item: ${ITEM_UUID}`);
console.log('');

async function testEndpoint(name, url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name}: ${response.status}`);
      return data;
    } else {
      console.log(`❌ ${name}: ${response.status} - ${data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${name}: Network error - ${error.message}`);
    return null;
  }
}

async function runTests() {
  // Test 1: Chat API
  console.log('1️⃣ Testing Chat API...');
  const chatData = await testEndpoint('Chat', `${BASE}/api/chat`, 'POST', {
    restaurantId: RESTAURANT_UUID,
    sessionToken: 'smoke-test-123',
    message: 'What vegan options do you have?'
  });
  
  if (!chatData || (!chatData.response && !chatData.suggestions)) {
    console.log('   💡 Hint: Check if OpenAI API key is set in environment');
    return false;
  }

  // Test 2: Dine-in Order
  console.log('\n2️⃣ Testing Dine-in Order...');
  const dineInData = await testEndpoint('Dine-in Order', `${BASE}/api/orders`, 'POST', {
    restaurantId: RESTAURANT_UUID,
    sessionToken: 'smoke-test-123',
    type: 'dine_in',
    items: [{ itemId: ITEM_UUID, qty: 1 }]
  });
  
  if (!dineInData || !dineInData.orderCode) {
    console.log('   💡 Hint: Check Vercel function logs for /api/orders');
    console.log('   💡 Hint: Verify item belongs to restaurant');
    return false;
  }

  // Test 3: Pickup Order
  console.log('\n3️⃣ Testing Pickup Order...');
  const pickupData = await testEndpoint('Pickup Order', `${BASE}/api/orders`, 'POST', {
    restaurantId: RESTAURANT_UUID,
    sessionToken: 'smoke-test-123',
    type: 'pickup',
    items: [{ itemId: ITEM_UUID, qty: 1 }]
  });
  
  if (!pickupData || !pickupData.checkoutUrl) {
    console.log('   💡 Hint: Check if Stripe keys are configured');
    console.log('   💡 Hint: Verify Stripe checkout session creation');
    return false;
  }

  console.log('\n🎉 All smoke tests passed!');
  console.log('========================');
  console.log('✅ Chat API responding');
  console.log('✅ Dine-in orders working');
  console.log('✅ Pickup orders with Stripe working');
  console.log('\n🚀 Ready for Widget v1 polish!');
  
  return true;
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
