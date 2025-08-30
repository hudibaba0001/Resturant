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
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data });
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

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  try {
    const result = await makeRequest(url, options);
    if (result.status >= 200 && result.status < 300) {
      console.log(`✅ ${name}: ${result.status} OK`);
      return true;
    } else {
      console.log(`❌ ${name}: ${result.status} FAILED`);
      console.log(`   Response:`, result.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR`);
    console.log(`   Error:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing Critical Endpoints for Launch');
  console.log(`📍 Base URL: ${BASE_URL}`);
  
  const results = [];
  
  // Test 1: Health check
  results.push(await testEndpoint('Health Check', `${BASE_URL}/api/health`));
  
  // Test 2: Menu endpoint
  results.push(await testEndpoint('Menu API', `${BASE_URL}/api/public/menu?restaurantId=test`));
  
  // Test 3: Sessions endpoint
  results.push(await testEndpoint('Sessions API', `${BASE_URL}/api/sessions`, {
    method: 'POST',
    body: JSON.stringify({ restaurantId: 'test' })
  }));
  
  // Test 4: Orders endpoint
  results.push(await testEndpoint('Orders API', `${BASE_URL}/api/orders`, {
    method: 'POST',
    body: JSON.stringify({
      restaurantId: 'test',
      sessionToken: 'test',
      items: []
    })
  }));
  
  // Test 5: Chat endpoint
  results.push(await testEndpoint('Chat API', `${BASE_URL}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      message: 'test',
      sessionId: 'test'
    })
  }));
  
  // Summary
  console.log('\n📊 Test Results:');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All critical endpoints are working!');
    console.log('🚀 Ready for launch testing.');
  } else {
    console.log('\n⚠️  Some endpoints failed. Fix before launch.');
    process.exit(1);
  }
}

runTests().catch(console.error);
