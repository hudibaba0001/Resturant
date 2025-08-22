// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Simple script to get restaurant ID
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Please check your .env.local file');
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getRestaurantId() {
  console.log('🔍 Getting restaurant ID...');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Not authenticated. Please log in first.');
      console.log('💡 Go to http://localhost:3000 and log in, then run this script again.');
      return;
    }

    console.log(`✅ Authenticated as: ${user.email}`);

    // Get user's restaurants
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, is_active, is_verified')
      .eq('owner_id', user.id)
      .limit(5);

    if (restaurantError) {
      console.error('❌ Error fetching restaurants:', restaurantError.message);
      return;
    }

    if (!restaurants || restaurants.length === 0) {
      console.error('❌ No restaurants found for this user');
      console.log('💡 You may need to create a restaurant first via the onboarding flow');
      return;
    }

    console.log('\n🍕 Your Restaurants:');
    restaurants.forEach((restaurant, index) => {
      console.log(`${index + 1}. ${restaurant.name}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   Active: ${restaurant.is_active ? '✅' : '❌'}`);
      console.log(`   Verified: ${restaurant.is_verified ? '✅' : '❌'}`);
      console.log('');
    });

    if (restaurants.length === 1) {
      console.log('🎯 Use this Restaurant ID for activation:');
      console.log(`   ${restaurants[0].id}`);
    } else {
      console.log('🎯 Choose which restaurant to activate and use its ID');
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

getRestaurantId();
