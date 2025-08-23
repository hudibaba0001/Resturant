const { createClient } = require('@supabase/supabase-js');

// Direct environment variables
const SUPABASE_URL = 'https://odpsdvayltdqcyhchosy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_X5EZOhpktAb3_fF3yHoU4Q_vupradoz';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRestaurant() {
  console.log('🔍 Checking restaurant...');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Not authenticated. Please log in first.');
      console.log('💡 Go to http://localhost:3000 and log in, then run this script again.');
      return;
    }

    console.log(`✅ Authenticated as: ${user.email}`);

    // Check if the specific restaurant exists
    const { data: specificRestaurant, error: specificError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', 'bc19346b-72fb-423e-a77d-36ae8ffe0d95');

    if (specificError) {
      console.error('❌ Error checking specific restaurant:', specificError.message);
      return;
    }

    console.log('\n🎯 Checking specific restaurant ID: bc19346b-72fb-423e-a77d-36ae8ffe0d95');
    console.log('Found:', specificRestaurant ? specificRestaurant.length : 0, 'restaurants');

    if (specificRestaurant && specificRestaurant.length > 0) {
      console.log('✅ Restaurant exists!');
      console.log('Name:', specificRestaurant[0].name);
      console.log('Owner ID:', specificRestaurant[0].owner_id);
      console.log('Active:', specificRestaurant[0].is_active);
      console.log('Verified:', specificRestaurant[0].is_verified);
    } else {
      console.log('❌ Restaurant not found with that ID');
    }

    // Get all restaurants for this user
    const { data: allRestaurants, error: allError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id);

    if (allError) {
      console.error('❌ Error fetching all restaurants:', allError.message);
      return;
    }

    console.log('\n🍕 All your restaurants:');
    if (allRestaurants && allRestaurants.length > 0) {
      allRestaurants.forEach((restaurant, index) => {
        console.log(`${index + 1}. ${restaurant.name}`);
        console.log(`   ID: ${restaurant.id}`);
        console.log(`   Active: ${restaurant.is_active ? '✅' : '❌'}`);
        console.log(`   Verified: ${restaurant.is_verified ? '✅' : '❌'}`);
        console.log('');
      });
      
      console.log('🎯 Use this Restaurant ID for activation:');
      console.log(`   ${allRestaurants[0].id}`);
    } else {
      console.log('❌ No restaurants found for this user');
      console.log('💡 You may need to create a restaurant first via the onboarding flow');
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

checkRestaurant();
