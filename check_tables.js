require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  try {
    console.log('🔍 Checking if orders table exists...');
    
    // Try to query orders table
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (ordersError) {
      console.log('❌ Orders table error:', ordersError.message);
    } else {
      console.log('✅ Orders table exists');
    }

    console.log('🔍 Checking if order_items table exists...');
    
    // Try to query order_items table
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')
      .limit(1);
    
    if (orderItemsError) {
      console.log('❌ Order_items table error:', orderItemsError.message);
    } else {
      console.log('✅ Order_items table exists');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTables();
