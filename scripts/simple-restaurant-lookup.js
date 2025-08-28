const { createClient } = require('@supabase/supabase-js');

// Direct configuration
const SUPABASE_URL = 'https://odpsdvayltdqcyhchosy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcHNsZHZheWx0ZHFjeWhjaG9zeSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NTU2MDk0OTYsImV4cCI6MjA3MTE4NTQ5Nn0.TiDMsxWwrGxQuuo2kJ20nijrekpdM3zwGQYMWS3GdCs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findRestaurantByEmail(email) {
  console.log(`🔍 Looking for restaurants with email: ${email}`);
  
  try {
    // Method 1: Direct email search in restaurants table
    console.log('\n1️⃣ Searching restaurants table by email...');
    const { data: restaurantsByEmail, error: emailError } = await supabase
      .from('restaurants')
      .select('id, name, email, owner_id, is_active, is_verified')
      .eq('email', email);

    if (emailError) {
      console.error('❌ Error searching by email:', emailError);
    } else if (restaurantsByEmail && restaurantsByEmail.length > 0) {
      console.log('✅ Found restaurants with this email:');
      restaurantsByEmail.forEach((restaurant, index) => {
        console.log(`${index + 1}. ${restaurant.name}`);
        console.log(`   ID: ${restaurant.id}`);
        console.log(`   Email: ${restaurant.email}`);
        console.log(`   Active: ${restaurant.is_active ? '✅' : '❌'}`);
        console.log(`   Verified: ${restaurant.is_verified ? '✅' : '❌'}`);
        console.log('');
      });
    } else {
      console.log('❌ No restaurants found with this email');
    }

    // Method 2: Find user by email and then their restaurants
    console.log('\n2️⃣ Searching for user by email...');
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email);

    if (userError) {
      console.error('❌ Error finding user:', userError);
    } else if (users && users.length > 0) {
      const user = users[0];
      console.log(`✅ Found user: ${user.email} (${user.id})`);
      
      // Find restaurants owned by this user
      console.log('\n3️⃣ Searching for restaurants owned by this user...');
      const { data: userRestaurants, error: userRestaurantError } = await supabase
        .from('restaurants')
        .select('id, name, email, owner_id, is_active, is_verified')
        .eq('owner_id', user.id);

      if (userRestaurantError) {
        console.error('❌ Error finding user restaurants:', userRestaurantError);
      } else if (userRestaurants && userRestaurants.length > 0) {
        console.log('✅ Restaurants owned by this user:');
        userRestaurants.forEach((restaurant, index) => {
          console.log(`${index + 1}. ${restaurant.name}`);
          console.log(`   ID: ${restaurant.id}`);
          console.log(`   Email: ${restaurant.email || 'Not set'}`);
          console.log(`   Active: ${restaurant.is_active ? '✅' : '❌'}`);
          console.log(`   Verified: ${restaurant.is_verified ? '✅' : '❌'}`);
          console.log('');
        });
      } else {
        console.log('❌ No restaurants found for this user');
      }
    } else {
      console.log('❌ No user found with this email');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
const email = 'nn@gmail.com';
findRestaurantByEmail(email);
