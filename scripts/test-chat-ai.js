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
        'User-Agent': 'Stjarna-Chat-Test/1.0.0',
        ...options.headers,
      },
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    console.log(`🌐 Testing: ${url}`);
    console.log(`📤 Request body:`, options.body);

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`📡 Status: ${res.statusCode}`);
        try {
          const jsonData = JSON.parse(data);
          console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log(`📄 Raw response:`, data);
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

async function testAIChat() {
  console.log('🤖 TESTING AI CHAT INTEGRATION');
  console.log(`📍 Testing: ${BASE_URL}`);
  console.log('=' .repeat(60));

  try {
    // Test 1: Chat with no message (should return welcome)
    console.log('\n1️⃣  Testing Chat Welcome...');
    const welcomeResult = await makeRequest(`${BASE_URL}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({})
    });

    // Test 2: Chat with a real question
    console.log('\n2️⃣  Testing AI Chat Response...');
    const chatResult = await makeRequest(`${BASE_URL}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message: "What vegan options do you have?",
        restaurantId: "64806e5b-714f-4388-a092-29feff9b64c0"
      })
    });

    // Test 3: Chat with another question
    console.log('\n3️⃣  Testing AI Chat with Different Question...');
    const spicyResult = await makeRequest(`${BASE_URL}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message: "What's spicy on your menu?",
        restaurantId: "64806e5b-714f-4388-a092-29feff9b64c0"
      })
    });

    // Analysis
    console.log('\n📊 AI CHAT ANALYSIS:');
    console.log('=' .repeat(60));
    
    if (chatResult.status === 200) {
      try {
        const response = JSON.parse(chatResult.data);
        if (response.reply && response.reply.text) {
          const text = response.reply.text;
          
          // Check if it's a generic response or AI-generated
          const genericResponses = [
            'Let me help with that',
            'What are you in the mood for',
            'I can help you find',
            'Ask me about our menu'
          ];
          
          const isGeneric = genericResponses.some(generic => 
            text.toLowerCase().includes(generic.toLowerCase())
          );
          
          if (isGeneric) {
            console.log('❌ AI NOT ACTIVATED: Response is generic fallback');
            console.log('💡 This means OpenAI API key is not working');
          } else {
            console.log('✅ AI ACTIVATED: Response appears to be AI-generated');
            console.log('🎉 ChatGPT is working with your menu!');
          }
        }
      } catch (e) {
        console.log('❌ Could not parse response');
      }
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

testAIChat().catch(console.error);
