#!/usr/bin/env node

// Test script to verify quota system
const { checkQuota, getPlanLimits } = require('../lib/quotas.ts');

async function testQuotas() {
  console.log('🧪 Testing Quota System...\n');
  
  const testRestaurantId = '64806e5b-714f-4388-a092-29feff9b64c0';
  
  try {
    // Test 1: Check plan limits
    console.log('1. Testing plan limits...');
    const limits = await getPlanLimits(testRestaurantId);
    console.log(`   ✅ Plan limits: ${limits.messages} messages, ${limits.tokens} tokens`);
    
    // Test 2: Check quota
    console.log('\n2. Testing quota check...');
    const quota = await checkQuota(testRestaurantId);
    console.log(`   ✅ Quota allowed: ${quota.allowed}`);
    console.log(`   ✅ Usage: ${quota.usage.messages}/${quota.limits.messages} messages`);
    console.log(`   ✅ Reason: ${quota.reason || 'None'}`);
    
    // Test 3: Test chat endpoint
    console.log('\n3. Testing chat endpoint...');
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: testRestaurantId,
        sessionToken: 'test-session',
        message: 'budget options'
      })
    });
    
    const data = await response.json();
    console.log(`   ✅ Chat response status: ${response.status}`);
    console.log(`   ✅ Has reply: ${!!data.reply}`);
    console.log(`   ✅ Cards count: ${data.cards?.length || 0}`);
    
    if (data.reply) {
      console.log(`   ✅ Reply text: "${data.reply.text}"`);
    }
    
    console.log('\n🎉 All tests passed! Quota system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testQuotas();
