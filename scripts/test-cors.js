#!/usr/bin/env node

// Test CORS fix for chat API
async function testCORS() {
  const BASE_URL = process.env.BASE_URL || 'https://resturant-two-xi.vercel.app';
  
  console.log('🔧 Testing CORS fix for Chat API\n');
  
  try {
    // Test with cross-origin header (simulating widget on different domain)
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'https://some-restaurant-site.example'
      },
      body: JSON.stringify({
        restaurantId: 'demo',
        sessionToken: 'smoke',
        message: 'Italian dishes?'
      })
    });

    console.log('Status:', response.status);
    console.log('CORS Headers:');
    console.log('  Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('  Vary:', response.headers.get('vary'));
    console.log('  X-Chat-Debug:', response.headers.get('x-chat-debug'));
    
    const data = await response.json();
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok && data.reply?.text) {
      console.log('\n✅ CORS fix working!');
      console.log('✅ Chat API responding with proper CORS headers');
      console.log('✅ Reply:', data.reply.text);
      console.log('✅ Cards:', data.cards?.length || 0);
    } else {
      console.log('\n❌ CORS fix failed');
    }
  } catch (err) {
    console.error('💥 Test failed:', err.message);
  }
}

testCORS();
