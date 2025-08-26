#!/usr/bin/env node

// Use node-fetch if available, otherwise use global fetch
let fetch;
try {
  fetch = require('node-fetch');
} catch {
  fetch = globalThis.fetch;
}

async function testChat() {
  try {
    console.log('Testing chat API...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: 'demo',
        sessionToken: 'smoke',
        message: 'Italian dishes?'
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok && data.reply?.text) {
      console.log('\n✅ Chat API working!');
      console.log('Reply:', data.reply.text);
      console.log('Cards:', data.cards?.length || 0);
    } else {
      console.log('\n❌ Chat API failed');
    }
  } catch (err) {
    console.error('💥 Test failed:', err.message);
    console.error('Stack:', err.stack);
  }
}

testChat();
