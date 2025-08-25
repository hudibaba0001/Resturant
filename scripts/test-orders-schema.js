const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOrdersSchema() {
  try {
    console.log('Testing orders table structure...');
    
    // Try to insert a minimal order
    const testOrder = {
      restaurant_id: '64806e5b-714f-4388-a092-29feff9b64c0',
      customer_name: 'Test Customer',
      phone_e164: '+1234567890',
      email: 'test@example.com',
      total_cents: 1000,
      status: 'pending'
    };

    console.log('Attempting to insert order with fields:', Object.keys(testOrder));
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();

    if (error) {
      console.log('❌ Order insertion failed:', error.message);
      
      // Try to get table info
      const { data: sampleOrder } = await supabase
        .from('orders')
        .select('*')
        .limit(1);
      
      if (sampleOrder && sampleOrder.length > 0) {
        console.log('✅ Orders table exists with columns:', Object.keys(sampleOrder[0]));
      } else {
        console.log('❌ Orders table is empty or doesn\'t exist');
      }
    } else {
      console.log('✅ Order created successfully:', order.id);
      
      // Clean up
      await supabase.from('orders').delete().eq('id', order.id);
      console.log('✅ Test order cleaned up');
    }

  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
  }
}

testOrdersSchema();
