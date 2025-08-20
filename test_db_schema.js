require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function testSchema() {
  try {
    console.log('🔍 Testing database schema...');
    
    // Check if orders table exists
    const { data: ordersColumns, error: ordersError } = await supabase
      .rpc('get_table_columns', { table_name: 'orders' })
      .catch(() => ({ data: null, error: 'Table does not exist' }));
    
    if (ordersError) {
      console.log('❌ Orders table check:', ordersError);
    } else {
      console.log('✅ Orders table exists');
    }

    // Check if order_items table exists
    const { data: orderItemsColumns, error: orderItemsError } = await supabase
      .rpc('get_table_columns', { table_name: 'order_items' })
      .catch(() => ({ data: null, error: 'Table does not exist' }));
    
    if (orderItemsError) {
      console.log('❌ Order_items table check:', orderItemsError);
    } else {
      console.log('✅ Order_items table exists');
    }

    // Test menu_items query
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price_cents, currency, restaurant_id, is_available')
      .eq('restaurant_id', 'bc19346b-72fb-423e-a77d-36ae8ffe0d95')
      .limit(1);

    if (menuError) {
      console.log('❌ Menu items query error:', menuError);
    } else {
      console.log('✅ Menu items query works:', menuItems?.[0]);
    }

    // Test restaurant query
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', 'bc19346b-72fb-423e-a77d-36ae8ffe0d95')
      .single();

    if (restaurantError) {
      console.log('❌ Restaurant query error:', restaurantError);
    } else {
      console.log('✅ Restaurant query works:', restaurant?.name);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSchema();
