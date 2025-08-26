#!/usr/bin/env node

// Debug widget chat functionality
async function debugWidget() {
  const BASE_URL = process.env.BASE_URL || 'https://resturant-two-xi.vercel.app';
  
  console.log('🔍 Debugging Widget Chat\n');
  
  // Test 1: Check if widget loads
  console.log('1️⃣ Testing widget script load...');
  try {
    const widgetResponse = await fetch(`${BASE_URL}/widget.js`);
    console.log('Widget script status:', widgetResponse.status);
    if (widgetResponse.ok) {
      console.log('✅ Widget script loads successfully');
    } else {
      console.log('❌ Widget script failed to load');
    }
  } catch (err) {
    console.log('❌ Widget script load error:', err.message);
  }
  
  // Test 2: Check if chat API works with widget payload
  console.log('\n2️⃣ Testing chat API with widget payload...');
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Widget-Version': '1.0.0',
        'Origin': 'https://example.com'
      },
      body: JSON.stringify({
        restaurantId: 'demo',
        sessionToken: 'widget-test-session',
        message: 'Italian dishes?'
      })
    });

    console.log('Chat API Status:', response.status);
    console.log('CORS Headers:');
    console.log('  Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('  X-Chat-Debug:', response.headers.get('x-chat-debug'));
    
    const data = await response.json();
    console.log('\nResponse data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok && data.reply?.text) {
      console.log('\n✅ Chat API working with widget payload');
      console.log('✅ Reply text:', data.reply.text);
      console.log('✅ Cards count:', data.cards?.length || 0);
    } else {
      console.log('\n❌ Chat API not working with widget payload');
    }
  } catch (err) {
    console.log('❌ Chat API test failed:', err.message);
  }
  
  // Test 3: Check widget demo page
  console.log('\n3️⃣ Testing widget demo page...');
  try {
    const demoResponse = await fetch(`${BASE_URL}/widget-demo`);
    console.log('Demo page status:', demoResponse.status);
    if (demoResponse.ok) {
      console.log('✅ Widget demo page loads');
    } else {
      console.log('❌ Widget demo page failed');
    }
  } catch (err) {
    console.log('❌ Demo page error:', err.message);
  }
}

debugWidget();
