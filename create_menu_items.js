require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function createMenuItems() {
  try {
    console.log('🍽️ Creating menu items for demo restaurant...');
    
    // Get existing restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', 'demo-bistro')
      .single();

    if (restaurantError) {
      console.error('❌ Error fetching restaurant:', restaurantError);
      return;
    }

    console.log('✅ Found restaurant:', restaurant.name);

    // Create menu items (using schema from migration)
    const menuItems = [
      {
        restaurant_id: restaurant.id,
        name: 'Grilled Veggie Bowl',
        description: 'High-protein, vegan bowl with quinoa and roasted vegetables',
        price: 119.00,
        category: 'Mains',
        allergens: ['vegan', 'high-protein'],
        is_available: true
      },
      {
        restaurant_id: restaurant.id,
        name: 'Chicken Caesar Salad',
        description: 'Classic Caesar with grilled chicken, contains dairy',
        price: 129.00,
        category: 'Mains',
        allergens: ['contains-dairy', 'high-protein'],
        is_available: true
      }
    ];

    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .insert(menuItems)
      .select();

    if (itemsError) {
      console.error('❌ Error creating menu items:', itemsError);
      return;
    }

    console.log('✅ Menu items created:');
    items.forEach(item => {
      console.log(`   - ${item.name} (${item.id}) - ${item.price} SEK`);
    });

    console.log('\n🎯 Demo data complete!');
    console.log('\n📋 Use these UUIDs for smoke tests:');
    console.log(`RESTAURANT_UUID=${restaurant.id}`);
    console.log(`ITEM_UUID=${items[0].id}`);
    console.log(`BASE=https://resturant-q5tagaio9-lovedeep-singhs-projects-96b003a8.vercel.app`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createMenuItems();
