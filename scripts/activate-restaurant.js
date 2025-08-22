#!/usr/bin/env node

/**
 * Restaurant Activation Script
 * 
 * This script helps you:
 * 1. Find your restaurant ID
 * 2. Activate and verify your restaurant
 * 3. Add sample menu items
 * 
 * Usage:
 * 1. Get your restaurant ID from the Embed page
 * 2. Update the RESTAURANT_ID below
 * 3. Run: node scripts/activate-restaurant.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - UPDATE THESE VALUES
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need this from Supabase dashboard
const RESTAURANT_ID = 'YOUR-RESTAURANT-ID-HERE'; // Replace with your actual restaurant ID

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (get this from Supabase Dashboard > Settings > API)');
  process.exit(1);
}

if (RESTAURANT_ID === 'YOUR-RESTAURANT-ID-HERE') {
  console.error('❌ Please update RESTAURANT_ID in this script with your actual restaurant ID');
  console.error('   You can find it on the Embed page in your dashboard');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function activateRestaurant() {
  console.log('🚀 Activating restaurant...');
  
  try {
    // 1. Activate and verify restaurant
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        is_active: true,
        is_verified: true,
        opening_hours: {
          monday: { open: "11:00", close: "22:00" },
          tuesday: { open: "11:00", close: "22:00" },
          wednesday: { open: "11:00", close: "22:00" },
          thursday: { open: "11:00", close: "22:00" },
          friday: { open: "11:00", close: "23:00" },
          saturday: { open: "12:00", close: "23:00" },
          sunday: { open: "12:00", close: "21:00" }
        }
      })
      .eq('id', RESTAURANT_ID);

    if (updateError) {
      console.error('❌ Failed to activate restaurant:', updateError);
      return;
    }

    console.log('✅ Restaurant activated and verified!');
    console.log('✅ Opening hours set (11:00-22:00 weekdays, 12:00-23:00 weekends)');

    // 2. Add sample menu items
    const menuItems = [
      {
        restaurant_id: RESTAURANT_ID,
        name: "Margherita Pizza",
        description: "Fresh tomato sauce, mozzarella, basil",
        price_cents: 9900,
        currency: "SEK",
        category: "Mains",
        is_available: true,
        allergens: ["gluten", "dairy"],
        tags: ["vegetarian", "popular"]
      },
      {
        restaurant_id: RESTAURANT_ID,
        name: "Caesar Salad",
        description: "Romaine lettuce, parmesan cheese, croutons, caesar dressing",
        price_cents: 7900,
        currency: "SEK",
        category: "Salads",
        is_available: true,
        allergens: ["gluten", "dairy", "eggs"],
        tags: ["vegetarian", "healthy"]
      },
      {
        restaurant_id: RESTAURANT_ID,
        name: "Pasta Carbonara",
        description: "Spaghetti with eggs, cheese, pancetta, black pepper",
        price_cents: 8900,
        currency: "SEK",
        category: "Mains",
        is_available: true,
        allergens: ["gluten", "dairy", "eggs"],
        tags: ["popular", "creamy"]
      },
      {
        restaurant_id: RESTAURANT_ID,
        name: "Tiramisu",
        description: "Classic Italian dessert with coffee and mascarpone",
        price_cents: 5900,
        currency: "SEK",
        category: "Desserts",
        is_available: true,
        allergens: ["gluten", "dairy", "eggs"],
        tags: ["dessert", "coffee"]
      }
    ];

    console.log('🍕 Adding menu items...');
    
    for (const item of menuItems) {
      const { error: insertError } = await supabase
        .from('menu_items')
        .insert(item);

      if (insertError) {
        console.error(`❌ Failed to add ${item.name}:`, insertError);
      } else {
        console.log(`✅ Added: ${item.name} (${item.price_cents / 100} SEK)`);
      }
    }

    console.log('\n🎉 Restaurant setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh your dashboard');
    console.log('2. Go to Embed page - the yellow warning should be gone');
    console.log('3. Try the widget preview - it should show your real menu items');
    console.log('4. Test the chat and ordering features');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
activateRestaurant();
