#!/usr/bin/env node

const BASE_URL = 'https://resturant-two-xi.vercel.app';

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
  console.log('🚀 Testing Working APIs\n');
  
  // Test 1: Health check
  const health = await test('/api/health');
  
  // Test 2: Menu API
  const menu = await test('/api/public/menu?restaurantId=64806e5b-714f-4388-a092-29feff9b64c0');
  
  // Test 3: Chat API
  const chat = await test('/api/chat', 'POST', {
    restaurantId: '64806e5b-714f-4388-a092-29feff9b64c0',
    sessionToken: 'test-session',
    message: 'Italian dishes?'
  });
  
  console.log('\n📊 Results:');
  console.log('===========');
  console.log(`Health API: ${health.ok ? '✅ Working' : '❌ Failed'}`);
  console.log(`Menu API: ${menu.ok ? '✅ Working' : '❌ Failed'}`);
  console.log(`Chat API: ${chat.ok ? '✅ Working' : '❌ Failed'}`);
  
  if (health.ok && menu.ok && chat.ok) {
    console.log('\n🎉 Core APIs are working perfectly!');
    console.log('✅ Ready for widget integration');
    console.log('✅ Chat functionality operational');
    console.log('✅ Menu display working');
  }
}

main().catch(err => {
  console.error('💥 Test failed:', err);
});
