#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Use the production URL instead of localhost
const BASE_URL = 'https://resturant-two-xi.vercel.app';

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

    console.log(`🌐 Making request to: ${url}`);

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`📡 Response: ${res.statusCode}`);
        try {
          const jsonData = JSON.parse(data);
          console.log(`📄 Data:`, jsonData);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          console.log(`📄 Text:`, data);
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Request error:`, err.message);
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testProductionEndpoints() {
  console.log('🚀 PRODUCTION LAUNCH TEST');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('=' .repeat(60));

  const results = [];

  try {
    // Test 1: Health Check
    console.log('\n1️⃣  Testing Health Check...');
    const healthResult = await makeRequest(`${BASE_URL}/api/health`);
    if (healthResult.status === 200) {
      console.log('✅ Health Check: OK');
      results.push(true);
    } else {
      console.log('❌ Health Check: Failed');
      results.push(false);
    }

    // Test 2: Menu API
    console.log('\n2️⃣  Testing Menu API...');
    const menuResult = await makeRequest(`${BASE_URL}/api/public/menu?restaurantId=test`);
    if (menuResult.status === 200) {
      console.log('✅ Menu API: OK');
      results.push(true);
    } else {
      console.log('❌ Menu API: Failed');
      results.push(false);
    }

    // Test 3: Sessions API with real UUID
    console.log('\n3️⃣  Testing Sessions API...');
    const sessionResult = await makeRequest(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      body: JSON.stringify({ 
        restaurantId: '64806e5b-714f-4388-a092-29feff9b64c0' // Real UUID from your DB
      })
    });
    if (sessionResult.status === 200) {
      console.log('✅ Sessions API: OK');
      results.push(true);
    } else {
      console.log('❌ Sessions API: Failed');
      results.push(false);
    }

    // Test 4: Orders API with real data
    console.log('\n4️⃣  Testing Orders API...');
    const orderResult = await makeRequest(`${BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: '64806e5b-714f-4388-a092-29feff9b64c0',
        sessionToken: 'test',
        items: []
      })
    });
    if (orderResult.status === 200 || orderResult.status === 400) {
      console.log('✅ Orders API: Responding (even if validation fails)');
      results.push(true);
    } else {
      console.log('❌ Orders API: Failed');
      results.push(false);
    }

    // Test 5: Chat API
    console.log('\n5️⃣  Testing Chat API...');
    const chatResult = await makeRequest(`${BASE_URL}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'test',
        sessionId: 'test'
      })
    });
    if (chatResult.status === 200) {
      console.log('✅ Chat API: OK');
      results.push(true);
    } else {
      console.log('❌ Chat API: Failed');
      results.push(false);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    results.push(false);
  }

  // Summary
  console.log('\n📊 PRODUCTION TEST RESULTS:');
  console.log('=' .repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 PRODUCTION LAUNCH READY!');
    console.log('✅ All critical endpoints are working in production');
    console.log('✅ Widget can be deployed to customers');
  } else {
    console.log('\n⚠️  PRODUCTION ISSUES FOUND!');
    console.log('❌ Some endpoints need fixing before launch');
  }

  return passed === total;
}

testProductionEndpoints().catch(console.error);
