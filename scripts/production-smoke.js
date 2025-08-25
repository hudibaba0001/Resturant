const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = 'https://resturant-git-feat-data-spine-lovedeep-singhs-projects-96b003a8.vercel.app';
const RESTAURANT_ID = '64806e5b-714f-4388-a092-29feff9b64c0';

async function productionSmoke() {
  console.log('🚀 Production P0 Pickup Smoke Test\n');
  
  try {
    // 1. Health Check
    console.log('1️⃣ Health Check...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health failed: ${healthResponse.status}`);
    }
    console.log('✅ Health OK');

    // 2. Menu API
    console.log('\n2️⃣ Menu API...');
    const menuResponse = await fetch(`${BASE_URL}/api/public/menu?restaurantId=${RESTAURANT_ID}`);
    if (!menuResponse.ok) {
      throw new Error(`Menu failed: ${menuResponse.status}`);
    }
    const menu = await menuResponse.json();
    console.log(`✅ Menu OK - ${menu.sections?.length || 0} sections`);

    // 3. Chat API
    console.log('\n3️⃣ Chat API...');
    const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Widget-Version': '1.0.0'
      },
      body: JSON.stringify({
        restaurantId: RESTAURANT_ID,
        sessionToken: 'production_smoke',
        message: 'Italian dishes?'
      })
    });
    
    if (!chatResponse.ok) {
      throw new Error(`Chat failed: ${chatResponse.status}`);
    }
    const chat = await chatResponse.json();
    console.log(`✅ Chat OK - ${chat.cards?.length || 0} cards`);

    // 4. Create Test Order
    console.log('\n4️⃣ Create Test Order...');
    const testOrder = {
      restaurant_id: RESTAURANT_ID,
      session_id: 'production_smoke_session',
      type: 'pickup',
      status: 'pending',
      total_cents: 2500,
      items: [{ itemId: 'test_item', qty: 2 }],
      customer_name: 'Production Test',
      phone_e164: '+1234567890',
      email: 'test@example.com'
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();

    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }
    console.log(`✅ Order created: ${order.id}`);

    // 5. Test PIN Generation (Dev Route)
    console.log('\n5️⃣ PIN Generation...');
    const markPaidResponse = await fetch(`${BASE_URL}/api/dev/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id })
    });

    if (!markPaidResponse.ok) {
      throw new Error(`PIN generation failed: ${markPaidResponse.status}`);
    }
    const pinResult = await markPaidResponse.json();
    console.log(`✅ PIN generated: ${pinResult.pin}`);

    // 6. Verify PIN Format
    if (!/^\d{4}$/.test(pinResult.pin)) {
      throw new Error(`Invalid PIN format: ${pinResult.pin}`);
    }
    console.log('✅ PIN format valid (4 digits)');

    // 7. Test Handoff
    console.log('\n6️⃣ Handoff Test...');
    const handoffResponse = await fetch(`${BASE_URL}/api/orders/handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        orderId: order.id,
        pin: pinResult.pin
      })
    });

    if (!handoffResponse.ok) {
      const error = await handoffResponse.json();
      throw new Error(`Handoff failed: ${error.error}`);
    }
    console.log('✅ Handoff successful');

    // 8. Verify Final State
    console.log('\n7️⃣ Verify Final State...');
    const { data: finalOrder } = await supabase
      .from('orders')
      .select('status, picked_up_at, pin_attempts')
      .eq('id', order.id)
      .single();

    if (finalOrder.status !== 'picked_up') {
      throw new Error(`Order status should be 'picked_up', got: ${finalOrder.status}`);
    }
    if (!finalOrder.picked_up_at) {
      throw new Error('picked_up_at not set');
    }
    console.log('✅ Order marked as picked up');

    // 9. Check Events
    console.log('\n8️⃣ Verify Events...');
    const { data: events } = await supabase
      .from('widget_events')
      .select('type, payload')
      .eq('restaurant_id', RESTAURANT_ID)
      .in('type', ['order_paid', 'order_picked_up'])
      .order('created_at', { ascending: false })
      .limit(5);

    const eventTypes = events?.map(e => e.type) || [];
    if (!eventTypes.includes('order_paid')) {
      throw new Error('order_paid event not found');
    }
    if (!eventTypes.includes('order_picked_up')) {
      throw new Error('order_picked_up event not found');
    }
    console.log(`✅ Events logged: ${eventTypes.join(', ')}`);

    // 10. Cleanup
    console.log('\n9️⃣ Cleanup...');
    await supabase.from('orders').delete().eq('id', order.id);
    await supabase
      .from('widget_events')
      .delete()
      .eq('payload->>orderId', order.id);
    console.log('✅ Test data cleaned up');

    // Success!
    console.log('\n🎉 PRODUCTION SMOKE TEST PASSED!');
    console.log('\n📋 P0 Pickup System is READY for pilot:');
    console.log('✅ Health endpoint responding');
    console.log('✅ Menu API functional');
    console.log('✅ Chat API working');
    console.log('✅ PIN generation working');
    console.log('✅ PIN validation working');
    console.log('✅ Handoff flow complete');
    console.log('✅ Events properly logged');
    console.log('✅ Database schema complete');

  } catch (error) {
    console.error('\n❌ PRODUCTION SMOKE TEST FAILED:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the test
productionSmoke();
