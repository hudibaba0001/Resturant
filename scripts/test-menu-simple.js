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
        if (res.statusCode >= 400) {
          try {
            const errorData = JSON.parse(data);
            console.log(`📄 Error:`, errorData);
          } catch (e) {
            console.log(`📄 Error:`, data);
          }
        }
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

async function testMenuSimple() {
  console.log('🍽️  SIMPLE MENU TEST');
  console.log(`📍 Testing: ${BASE_URL}`);
  console.log('=' .repeat(50));

  const results = [];

  try {
    // Test 1: Public Menu API (should work without auth)
    console.log('\n1️⃣  Testing Public Menu API...');
    const menuResult = await makeRequest(`${BASE_URL}/api/public/menu?restaurantId=64806e5b-714f-4388-a092-29feff9b64c0`);
    if (menuResult.status === 200) {
      console.log('✅ Public Menu API: Working');
      results.push(true);
    } else {
      console.log('❌ Public Menu API: Failed');
      results.push(false);
    }

    // Test 2: Health Check
    console.log('\n2️⃣  Testing Health Check...');
    const healthResult = await makeRequest(`${BASE_URL}/api/health`);
    if (healthResult.status === 200) {
      console.log('✅ Health Check: Working');
      results.push(true);
    } else {
      console.log('❌ Health Check: Failed');
      results.push(false);
    }

    // Test 3: Widget Demo Page
    console.log('\n3️⃣  Testing Widget Demo Page...');
    const widgetResult = await makeRequest(`${BASE_URL}/widget-demo`);
    if (widgetResult.status === 200) {
      console.log('✅ Widget Demo Page: Loading');
      results.push(true);
    } else {
      console.log('❌ Widget Demo Page: Failed');
      results.push(false);
    }

    // Test 4: Widget Preview Page
    console.log('\n4️⃣  Testing Widget Preview Page...');
    const previewResult = await makeRequest(`${BASE_URL}/widget-preview`);
    if (previewResult.status === 200) {
      console.log('✅ Widget Preview Page: Loading');
      results.push(true);
    } else {
      console.log('❌ Widget Preview Page: Failed');
      results.push(false);
    }

    // Test 5: Home Page
    console.log('\n5️⃣  Testing Home Page...');
    const homeResult = await makeRequest(`${BASE_URL}/`);
    if (homeResult.status === 200) {
      console.log('✅ Home Page: Loading');
      results.push(true);
    } else {
      console.log('❌ Home Page: Failed');
      results.push(false);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    results.push(false);
  }

  // Summary
  console.log('\n📊 SIMPLE MENU TEST RESULTS:');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 PUBLIC MENU FEATURES WORKING!');
    console.log('✅ All public menu features are functional');
    console.log('✅ Widget can be used by customers');
  } else {
    console.log('\n⚠️  SOME PUBLIC FEATURES HAVE ISSUES!');
    console.log('❌ Some features need fixing');
  }

  return passed === total;
}

testMenuSimple().catch(console.error);
