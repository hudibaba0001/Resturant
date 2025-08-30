#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

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

    console.log(`Making request to: ${url}`);
    console.log(`Options:`, requestOptions);

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response headers:`, res.headers);
        try {
          const jsonData = JSON.parse(data);
          console.log(`Response data:`, jsonData);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          console.log(`Response text:`, data);
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`Request error:`, err.message);
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
  console.log(`URL: ${url}`);
  try {
    const result = await makeRequest(url, options);
    console.log(`✅ ${name}: ${result.status} OK`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return false;
  }
}

async function runDebugTests() {
  console.log('🔍 DEBUGGING ENDPOINTS');
  console.log('=' .repeat(50));
  
  // Test basic connectivity
  await testEndpoint('Health Check', `${BASE_URL}/api/health`);
  
  // Test restaurants endpoint
  await testEndpoint('Restaurants', `${BASE_URL}/api/restaurants`);
  
  // Test menu endpoint
  await testEndpoint('Menu', `${BASE_URL}/api/public/menu?restaurantId=test`);
  
  // Test sessions endpoint
  await testEndpoint('Sessions', `${BASE_URL}/api/sessions`, {
    method: 'POST',
    body: JSON.stringify({ restaurantId: 'test' })
  });
}

runDebugTests().catch(console.error);
