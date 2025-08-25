// Browser-friendly API test script
// Run this in your browser's developer console on your Vercel deployment

const BASE_URL = 'https://resturant-git-feat-data-spine-lovedeep-singhs-projects-96b003a8.vercel.app';

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
      console.log(`✅ ${method} ${endpoint} (${ms}ms)`, data);
      return { ok: true, data, status: res.status };
    } else {
      console.log(`❌ ${method} ${endpoint} - ${res.status}:`, data);
      return { ok: false, error: data.error, status: res.status };
    }
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`💥 ${method} ${endpoint} - Network error: ${err.message} (${ms}ms)`);
    return { ok: false, error: err.message };
  }
}

async function runTests() {
  console.log('🚀 Browser API Test for P0 Flow\n');
  
  // Test 1: Health check
  console.log('1️⃣ Testing Health Check...');
  const health = await test('/api/health');
  
  // Test 2: Chat API
  console.log('\n2️⃣ Testing Chat API...');
  const chat = await test('/api/chat', 'POST', {
    restaurantId: 'test-restaurant',
    sessionToken: 'browser-test',
    message: 'Italian dishes?'
  });
  
  // Test 3: Menu API
  console.log('\n3️⃣ Testing Menu API...');
  const menu = await test('/api/public/menu?restaurantId=test-restaurant');
  
  console.log('\n🎉 Browser tests completed!');
  console.log('Check the results above for any errors.');
}

// Run the tests
runTests();
