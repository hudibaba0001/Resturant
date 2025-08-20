require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE) {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function getDemoUUIDs() {
  try {
    console.log('🔍 Finding existing demo data...');
    
    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', 'demo-bistro')
      .single();

    if (restaurantError) {
      console.error('❌ Error fetching restaurant:', restaurantError);
      return;
    }

    console.log('✅ Found restaurant:', restaurant.name, '(' + restaurant.id + ')');

    // Get menu items
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id);

    if (itemsError) {
      console.error('❌ Error fetching menu items:', itemsError);
      return;
    }

    console.log('✅ Found menu items:');
    items.forEach(item => {
      console.log(`   - ${item.name} (${item.id}) - ${item.price} ${item.currency || 'currency'}`);
    });

    console.log('\n🎯 Demo data already exists!');
    console.log('\n📋 Use these UUIDs for smoke tests:');
    console.log(`RESTAURANT_UUID=${restaurant.id}`);
    console.log(`ITEM_UUID=${items[0].id}`);
    console.log(`BASE=https://resturant-q5tagaio9-lovedeep-singhs-projects-96b003a8.vercel.app`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

getDemoUUIDs();
