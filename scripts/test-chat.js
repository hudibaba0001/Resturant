#!/usr/bin/env node

// Test script to verify chat endpoint
async function testChat() {
  console.log('🧪 Testing Chat Endpoint...\n');
  
  const testCases = [
    {
      name: 'Budget request',
      message: 'show me budget options'
    },
    {
      name: 'Vegan request', 
      message: 'do you have vegan food?'
    },
    {
      name: 'Pizza request',
      message: 'what pizzas do you have?'
    },
    {
      name: 'General help',
      message: 'hello'
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: 'test-123',
          sessionToken: 'test-session',
          message: testCase.message
        })
      });
      
      const data = await response.json();
      
      console.log(`  ✅ Status: ${response.status}`);
      console.log(`  ✅ Has reply: ${!!data.reply}`);
      console.log(`  ✅ Cards: ${data.cards?.length || 0}`);
      
      if (data.reply) {
        console.log(`  ✅ Text: "${data.reply.text}"`);
        console.log(`  ✅ Intent: ${data.reply.intent}`);
        console.log(`  ✅ Chips: [${data.reply.chips?.join(', ') || 'none'}]`);
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('🎉 Chat tests completed!');
}

// Run tests
testChat();
