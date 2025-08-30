#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Stjarna-Widget/1.0.0',
        ...options.headers,
      },
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testWidgetFlow() {
  console.log('🚀 LAUNCH TEST: Complete Widget Flow');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('=' .repeat(50));

  let sessionToken = null;
  let restaurantId = null;

  try {
    // Step 1: Get restaurant ID (simulate widget initialization)
    console.log('\n1️⃣  Getting restaurant ID...');
    const restaurantResponse = await makeRequest(`${BASE_URL}/api/restaurants`);
    if (restaurantResponse.status === 200 && restaurantResponse.data.length > 0) {
      restaurantId = restaurantResponse.data[0].id;
      console.log(`✅ Found restaurant: ${restaurantId}`);
    } else {
      console.log('❌ No restaurants found - create one first');
      return false;
    }

    // Step 2: Create widget session
    console.log('\n2️⃣  Creating widget session...');
    const sessionResponse = await makeRequest(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      body: JSON.stringify({ restaurantId })
    });
    
    if (sessionResponse.status === 200) {
      sessionToken = sessionResponse.data.sessionToken;
      console.log(`✅ Session created: ${sessionToken?.substring(0, 20)}...`);
    } else {
      console.log('❌ Failed to create session:', sessionResponse.data);
      return false;
    }

    // Step 3: Get menu
    console.log('\n3️⃣  Loading menu...');
    const menuResponse = await makeRequest(`${BASE_URL}/api/public/menu?restaurantId=${restaurantId}`);
    
    if (menuResponse.status === 200) {
      const menuItems = menuResponse.data.items || [];
      console.log(`✅ Menu loaded: ${menuItems.length} items`);
      
      if (menuItems.length === 0) {
        console.log('⚠️  Warning: No menu items found');
      }
    } else {
      console.log('❌ Failed to load menu:', menuResponse.data);
      return false;
    }

    // Step 4: Test chat
    console.log('\n4️⃣  Testing chat...');
    const chatResponse = await makeRequest(`${BASE_URL}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello, what do you recommend?',
        sessionId: sessionResponse.data.sessionId
      })
    });
    
    if (chatResponse.status === 200) {
      console.log('✅ Chat working');
    } else {
      console.log('❌ Chat failed:', chatResponse.data);
      return false;
    }

    // Step 5: Test order creation (with empty cart)
    console.log('\n5️⃣  Testing order creation...');
    const orderResponse = await makeRequest(`${BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        restaurantId,
        sessionToken,
        items: [],
        customerInfo: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1234567890'
        }
      })
    });
    
    if (orderResponse.status === 200) {
      console.log('✅ Order creation working');
    } else {
      console.log('❌ Order creation failed:', orderResponse.data);
      return false;
    }

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('🚀 Widget is ready for launch!');
    return true;

  } catch (error) {
    console.log('\n❌ TEST FAILED:', error.message);
    return false;
  }
}

async function testCORS() {
  console.log('\n🌐 Testing CORS...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/public/menu?restaurantId=test`, {
      headers: {
        'Origin': 'https://external-restaurant.com',
        'Referer': 'https://external-restaurant.com/menu'
      }
    });
    
    if (response.headers['access-control-allow-origin']) {
      console.log('✅ CORS configured correctly');
      return true;
    } else {
      console.log('❌ CORS not configured');
      return false;
    }
  } catch (error) {
    console.log('❌ CORS test failed:', error.message);
    return false;
  }
}

async function runLaunchTest() {
  console.log('🚀 STJARNA LAUNCH TEST');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test widget flow
  results.push(await testWidgetFlow());
  
  // Test CORS
  results.push(await testCORS());
  
  // Summary
  console.log('\n📊 LAUNCH TEST RESULTS:');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 LAUNCH READY!');
    console.log('✅ All critical systems working');
    console.log('✅ Widget can be deployed to customers');
  } else {
    console.log('\n⚠️  LAUNCH BLOCKED!');
    console.log('❌ Critical issues must be fixed before launch');
    process.exit(1);
  }
}

runLaunchTest().catch(console.error);
