const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOrdersTable() {
  try {
    console.log('Testing orders table access...');
    
    // Try to select from orders table
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing orders table:', error);
      return;
    }
    
    console.log('Orders table accessible!');
    
    if (orders && orders.length > 0) {
      console.log('Sample order columns:', Object.keys(orders[0]));
    } else {
      console.log('No orders found, but table exists');
    }
    
    // Try to insert a test order to see what columns are available
    const testOrder = {
      restaurant_id: '64806e5b-714f-4388-a092-29feff9b64c0', // Use existing restaurant ID
      status: 'pending',
      total_cents: 1000,
      items: [{ itemId: 'test', qty: 1 }]
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();
    
    if (insertError) {
      console.log('Insert test failed (expected):', insertError.message);
    } else {
      console.log('Test order inserted:', insertResult);
      
      // Clean up test order
      await supabase
        .from('orders')
        .delete()
        .eq('id', insertResult[0].id);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testOrdersTable();
