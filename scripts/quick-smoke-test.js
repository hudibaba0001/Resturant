const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = 'http://localhost:3000';
const RESTAURANT_ID = '64806e5b-714f-4388-a092-29feff9b64c0';

async function quickSmokeTest() {
  console.log('🔥 Quick P0 Smoke Test (Local)');
  console.log('================================\n');

  try {
    // 1. Test Menu API
    console.log('1️⃣ Testing Menu API...');
    const menuResponse = await fetch(`${BASE_URL}/api/public/menu?restaurant_id=${RESTAURANT_ID}`);
    if (menuResponse.ok) {
      const menuData = await menuResponse.json();
      console.log('✅ Menu API working - Found', menuData.items?.length || 0, 'items');
    } else {
      console.log('❌ Menu API failed:', menuResponse.status);
    }

    // 2. Test Chat API
    console.log('\n2️⃣ Testing Chat API...');
    const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: RESTAURANT_ID,
        message: 'Hello',
        sessionToken: 'test-session-' + Date.now()
      })
    });
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('✅ Chat API working - Response:', chatData.response?.substring(0, 50) + '...');
    } else {
      console.log('❌ Chat API failed:', chatResponse.status);
    }

    // 3. Create Test Order
    console.log('\n3️⃣ Creating Test Order...');
    const testOrder = {
      restaurant_id: RESTAURANT_ID,
      type: 'pickup',
      order_code: 'T' + (Date.now() % 100000).toString().padStart(5, '0'),
      customer_name: 'Test Customer',
      phone_e164: '+1234567890',
      email: 'test@example.com',
      total_cents: 1000,
      status: 'pending'
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();

    if (orderError) {
      console.log('❌ Order creation failed:', orderError.message);
      return;
    }

    console.log('✅ Test order created:', order.id);

    // 4. Test Dev Mark-Paid
    console.log('\n4️⃣ Testing Dev Mark-Paid...');
    const markPaidResponse = await fetch(`${BASE_URL}/api/dev/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id })
    });

    if (markPaidResponse.ok) {
      const markPaidData = await markPaidResponse.json();
      console.log('✅ Mark-paid working - PIN:', markPaidData.pin);
      
      // 5. Test Handoff
      console.log('\n5️⃣ Testing Handoff...');
      const handoffResponse = await fetch(`${BASE_URL}/api/orders/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: order.id, 
          pin: markPaidData.pin 
        })
      });

      if (handoffResponse.ok) {
        const handoffData = await handoffResponse.json();
        console.log('✅ Handoff working - Status:', handoffData.order?.status);
      } else {
        console.log('❌ Handoff failed:', handoffResponse.status);
      }
    } else {
      console.log('❌ Mark-paid failed:', markPaidResponse.status);
    }

    // 6. Cleanup
    console.log('\n6️⃣ Cleaning up...');
    await supabase.from('orders').delete().eq('id', order.id);
    console.log('✅ Test order cleaned up');

    console.log('\n🎉 Quick smoke test completed!');

  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
  }
}

quickSmokeTest();
