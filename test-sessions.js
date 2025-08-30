// Test script for the sessions endpoint
// Using actual restaurant UUID from database

const RESTAURANT_UUID = '0878c22f-bf42-40ab-ab61-0b30fe5273da'; // Restaurant: "sdcdwc"
const BASE_URL = 'https://resturant-git-feat-data-spine-lovedeep-singhs-projects-96b003a8.vercel.app';

async function testSessions() {
  try {
    console.log('🧪 Testing session bootstrap...');
    console.log('🏪 Restaurant:', RESTAURANT_UUID);
    
    const response = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://test.com'
      },
      body: JSON.stringify({
        restaurantId: RESTAURANT_UUID,
        locale: 'en-US'
      })
    });

    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('📊 Response Body:', data);

    if (response.ok) {
      console.log('✅ SUCCESS: Session created!');
      console.log('🔑 Session ID:', data.sessionId);
      console.log('🔑 Session Token:', data.sessionToken);
      
      // Test the orders endpoint with this session
      await testOrders(data.sessionToken);
    } else {
      console.log('❌ FAILED:', data.code, data.detail || '');
    }
  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
}

async function testOrders(sessionToken) {
  try {
    console.log('\n🧪 Testing orders endpoint...');
    
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        restaurantId: RESTAURANT_UUID,
        sessionToken: sessionToken,
        type: 'pickup',
        items: [
          {
            itemId: 'test-item-id', // This will fail validation, but we'll see the session validation
            qty: 1
          }
        ]
      })
    });

    const data = await response.json();
    
    console.log('📊 Orders Response Status:', response.status);
    console.log('📊 Orders Response Body:', data);

    if (response.status === 400 && data.code === 'BAD_LINE') {
      console.log('✅ SUCCESS: Session validation working! (Item validation failed as expected)');
    } else if (response.ok) {
      console.log('✅ SUCCESS: Order created!');
    } else {
      console.log('❌ Orders failed:', data.code, data.detail || '');
    }
  } catch (error) {
    console.error('💥 Orders ERROR:', error.message);
  }
}

// Run the test
console.log('🚀 Starting session bootstrap test...');
console.log('🏪 Restaurant UUID:', RESTAURANT_UUID);
console.log('🌐 Base URL:', BASE_URL);
console.log('');

testSessions();
