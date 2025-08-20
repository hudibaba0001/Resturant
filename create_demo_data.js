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

async function createDemoData() {
  try {
    console.log('🚀 Creating demo restaurant...');
    
         // 1. Create restaurant (using service role to bypass RLS)
     const { data: restaurant, error: restaurantError } = await supabase
       .from('restaurants')
       .insert({
         name: 'Demo Bistro',
         slug: 'demo-bistro',
         is_active: true,
         is_verified: true,
         owner_id: '00000000-0000-0000-0000-000000000000', // Placeholder for demo
         address: '123 Demo Street',
         city: 'Demo City',
         country: 'US',
         opening_hours: {
           monday: { open: '09:00', close: '17:00' },
           tuesday: { open: '09:00', close: '17:00' },
           wednesday: { open: '09:00', close: '17:00' },
           thursday: { open: '09:00', close: '17:00' },
           friday: { open: '09:00', close: '20:00' },
           saturday: { open: '10:00', close: '16:00' },
           sunday: { open: null, close: null }
         }
       })
       .select()
       .single();

    if (restaurantError) {
      console.error('❌ Error creating restaurant:', restaurantError);
      return;
    }

    console.log('✅ Restaurant created:', restaurant.id);
    console.log('📝 RESTAURANT_UUID =', restaurant.id);

    // 2. Create menu section
    const { data: section, error: sectionError } = await supabase
      .from('menu_sections')
      .insert({
        restaurant_id: restaurant.id,
        name: 'Mains',
        position: 0
      })
      .select()
      .single();

    if (sectionError) {
      console.error('❌ Error creating section:', sectionError);
      return;
    }

    console.log('✅ Menu section created:', section.id);

    // 3. Create menu items
    const menuItems = [
      {
        restaurant_id: restaurant.id,
        section_id: section.id,
        name: 'Grilled Veggie Bowl',
        description: 'High-protein, vegan bowl with quinoa and roasted vegetables',
        price_cents: 11900,
        currency: 'SEK',
        tags: ['vegan', 'high-protein'],
        is_available: true
      },
      {
        restaurant_id: restaurant.id,
        section_id: section.id,
        name: 'Chicken Caesar Salad',
        description: 'Classic Caesar with grilled chicken, contains dairy',
        price_cents: 12900,
        currency: 'SEK',
        tags: ['contains-dairy', 'high-protein'],
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
      console.log(`   - ${item.name} (${item.id})`);
    });

    console.log('\n🎯 Demo data created successfully!');
    console.log('\n📋 Use these UUIDs for smoke tests:');
    console.log(`RESTAURANT_UUID=${restaurant.id}`);
    console.log(`ITEM_UUID=${items[0].id}`);
    console.log(`BASE=https://resturant-q5tagaio9-lovedeep-singhs-projects-96b003a8.vercel.app`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createDemoData();
