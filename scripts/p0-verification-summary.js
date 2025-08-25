const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = 'http://localhost:3000';
const RESTAURANT_ID = '64806e5b-714f-4388-a092-29feff9b64c0';

async function p0VerificationSummary() {
  console.log('🎯 P0 Pickup Flow Verification Summary');
  console.log('=====================================\n');

  const results = {
    database: false,
    menu_api: false,
    order_creation: false,
    order_schema: false,
    dev_endpoints: false,
    chat_api: false,
    notifications: false
  };

  try {
    // 1. Database Connection Test
    console.log('1️⃣ Testing Database Connection...');
    const { data: restaurants, error: dbError } = await supabase
      .from('restaurants')
      .select('id, name')
      .limit(1);
    
    if (!dbError && restaurants) {
      console.log('✅ Database connected - Found restaurant:', restaurants[0]?.name || 'Unknown');
      results.database = true;
    } else {
      console.log('❌ Database connection failed:', dbError?.message);
    }

    // 2. Menu API Test
    console.log('\n2️⃣ Testing Menu API...');
    try {
      const menuResponse = await fetch(`${BASE_URL}/api/public/menu?restaurant_id=${RESTAURANT_ID}`);
      if (menuResponse.ok) {
        const menuData = await menuResponse.json();
        console.log('✅ Menu API working - Found', menuData.items?.length || 0, 'items');
        results.menu_api = true;
      } else {
        console.log('❌ Menu API failed:', menuResponse.status);
      }
    } catch (error) {
      console.log('❌ Menu API error:', error.message);
    }

    // 3. Order Schema Test
    console.log('\n3️⃣ Testing Order Schema...');
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

    if (!orderError && order) {
      console.log('✅ Order creation working - ID:', order.id);
      results.order_creation = true;
      results.order_schema = true;

      // Test dev mark-paid
      console.log('\n4️⃣ Testing Dev Mark-Paid...');
      try {
        const markPaidResponse = await fetch(`${BASE_URL}/api/dev/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id })
        });

        if (markPaidResponse.ok) {
          const markPaidData = await markPaidResponse.json();
          console.log('✅ Mark-paid working - PIN:', markPaidData.pin);
          results.dev_endpoints = true;

          // Test handoff
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
      } catch (error) {
        console.log('❌ Mark-paid error:', error.message);
      }

      // Cleanup
      await supabase.from('orders').delete().eq('id', order.id);
      console.log('✅ Test order cleaned up');
    } else {
      console.log('❌ Order creation failed:', orderError?.message);
    }

    // 6. Chat API Test
    console.log('\n6️⃣ Testing Chat API...');
    try {
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
        console.log('✅ Chat API working - Response received');
        results.chat_api = true;
      } else {
        console.log('❌ Chat API failed:', chatResponse.status);
      }
    } catch (error) {
      console.log('❌ Chat API error:', error.message);
    }

    // 7. Notification Test (check if env vars are set)
    console.log('\n7️⃣ Checking Notification Setup...');
    const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    const hasResend = !!process.env.RESEND_API_KEY;
    
    if (hasTwilio || hasResend) {
      console.log('✅ Notification providers configured:', {
        twilio: hasTwilio,
        resend: hasResend
      });
      results.notifications = true;
    } else {
      console.log('⚠️ No notification providers configured (SMS/Email will be skipped)');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }

  // Summary
  console.log('\n📊 P0 Verification Summary');
  console.log('==========================');
  console.log(`Database Connection: ${results.database ? '✅' : '❌'}`);
  console.log(`Menu API: ${results.menu_api ? '✅' : '❌'}`);
  console.log(`Order Creation: ${results.order_creation ? '✅' : '❌'}`);
  console.log(`Order Schema: ${results.order_schema ? '✅' : '❌'}`);
  console.log(`Dev Endpoints: ${results.dev_endpoints ? '✅' : '❌'}`);
  console.log(`Chat API: ${results.chat_api ? '✅' : '❌'}`);
  console.log(`Notifications: ${results.notifications ? '✅' : '⚠️'}`);

  const workingComponents = Object.values(results).filter(Boolean).length;
  const totalComponents = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Status: ${workingComponents}/${totalComponents} components working`);
  
  if (workingComponents >= 5) {
    console.log('🎉 P0 Core Flow: READY FOR TESTING');
    console.log('\nNext Steps:');
    console.log('1. Fix Chat API 500 error (check server logs)');
    console.log('2. Test end-to-end pickup flow manually');
    console.log('3. Deploy to production and run production smoke test');
  } else {
    console.log('⚠️ P0 Core Flow: NEEDS MORE WORK');
    console.log('\nPriority Fixes:');
    console.log('1. Fix database connection issues');
    console.log('2. Fix order creation/schema issues');
    console.log('3. Fix API endpoint errors');
  }
}

p0VerificationSummary();
