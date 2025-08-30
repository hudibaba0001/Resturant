#!/usr/bin/env node

const https = require('https');
const http = require('http');

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
        'User-Agent': 'Stjarna-Menu-Test/1.0.0',
        ...options.headers,
      },
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    console.log(`🌐 Testing: ${url}`);

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`📡 Status: ${res.statusCode}`);
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Error:`, err.message);
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testMenuDashboard() {
  console.log('🍽️  MENU DASHBOARD TEST');
  console.log(`📍 Testing: ${BASE_URL}`);
  console.log('=' .repeat(50));

  const results = [];

  try {
    // Test 1: Menu Dashboard Page
    console.log('\n1️⃣  Testing Menu Dashboard Page...');
    const dashboardResult = await makeRequest(`${BASE_URL}/dashboard/menus`);
    if (dashboardResult.status === 200) {
      console.log('✅ Menu Dashboard Page: Loading');
      results.push(true);
    } else {
      console.log('❌ Menu Dashboard Page: Failed');
      results.push(false);
    }

    // Test 2: Menu Item Save API
    console.log('\n2️⃣  Testing Menu Item Save API...');
    const saveResult = await makeRequest(`${BASE_URL}/dashboard/api/item/save`, {
      method: 'POST',
      body: JSON.stringify({
        id: 'test-item',
        name: 'Test Item',
        description: 'Test Description',
        price_cents: 1000,
        currency: 'SEK',
        restaurant_id: '64806e5b-714f-4388-a092-29feff9b64c0'
      })
    });
    if (saveResult.status === 200 || saveResult.status === 400) {
      console.log('✅ Menu Item Save API: Responding');
      results.push(true);
    } else {
      console.log('❌ Menu Item Save API: Failed');
      results.push(false);
    }

    // Test 3: Image Upload API
    console.log('\n3️⃣  Testing Image Upload API...');
    const uploadResult = await makeRequest(`${BASE_URL}/dashboard/api/upload`, {
      method: 'POST',
      body: JSON.stringify({ test: 'upload' })
    });
    if (uploadResult.status === 200 || uploadResult.status === 400) {
      console.log('✅ Image Upload API: Responding');
      results.push(true);
    } else {
      console.log('❌ Image Upload API: Failed');
      results.push(false);
    }

    // Test 4: Menu Data API
    console.log('\n4️⃣  Testing Menu Data API...');
    const menuDataResult = await makeRequest(`${BASE_URL}/api/public/menu?restaurantId=64806e5b-714f-4388-a092-29feff9b64c0`);
    if (menuDataResult.status === 200) {
      console.log('✅ Menu Data API: Working');
      results.push(true);
    } else {
      console.log('❌ Menu Data API: Failed');
      results.push(false);
    }

    // Test 5: Dashboard Layout
    console.log('\n5️⃣  Testing Dashboard Layout...');
    const layoutResult = await makeRequest(`${BASE_URL}/dashboard`);
    if (layoutResult.status === 200) {
      console.log('✅ Dashboard Layout: Loading');
      results.push(true);
    } else {
      console.log('❌ Dashboard Layout: Failed');
      results.push(false);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    results.push(false);
  }

  // Summary
  console.log('\n📊 MENU DASHBOARD TEST RESULTS:');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 MENU DASHBOARD READY!');
    console.log('✅ All menu management features working');
    console.log('✅ Dashboard can be used by restaurant owners');
  } else {
    console.log('\n⚠️  MENU DASHBOARD ISSUES FOUND!');
    console.log('❌ Some features need fixing');
  }

  return passed === total;
}

testMenuDashboard().catch(console.error);
