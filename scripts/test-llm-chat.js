#!/usr/bin/env node

// Test script for LLM chat system
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RESTAURANT_ID = process.argv[2] || '64806e5b-714f-4388-a092-29feff9b64c0';

async function testChat(message) {
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Widget-Version': '1.0.0'
      },
      body: JSON.stringify({
        restaurantId: RESTAURANT_ID,
        sessionToken: 'test-session',
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    console.log(`\n📝 Query: "${message}"`);
    console.log(`🤖 Reply: "${data.reply.text}"`);
    console.log(`🎯 Chips: [${data.reply.chips.join(', ')}]`);
    console.log(`📋 Cards: ${data.cards.length} items`);
    
    if (data.cards.length > 0) {
      data.cards.forEach((card, i) => {
        console.log(`   ${i + 1}. ${card.name} (${card.price_cents / 100} SEK)`);
      });
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Test failed for "${message}":`, error.message);
    return null;
  }
}

async function runTests() {
  console.log(`🧪 Testing LLM Chat System`);
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏪 Restaurant ID: ${RESTAURANT_ID}`);
  console.log(`⏰ ${new Date().toISOString()}\n`);

  const testCases = [
    "vegan options?",
    "Italian dishes?",
    "what is tofu?",
    "spicy food",
    "budget options under 100 SEK",
    "recommendations"
  ];

  for (const testCase of testCases) {
    await testChat(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log(`\n✅ All tests completed`);
}

runTests().catch(console.error);
