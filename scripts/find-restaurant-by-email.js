#!/usr/bin/env node

/**
 * Find Restaurant ID by Email
 * 
 * This script helps you find restaurant ID for a specific email address.
 * 
 * Usage: node scripts/find-restaurant-by-email.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findRestaurantByEmail(email) {
  console.log(`🔍 Looking for restaurants with email: ${email}`);
  
  try {
    // Method 1: Direct email search in restaurants table
    const { data: restaurantsByEmail, error: emailError } = await supabase
      .from('restaurants')
      .select('id, name, email, owner_id, is_active, is_verified')
      .eq('email', email);

    if (emailError) {
      console.error('❌ Error searching by email:', emailError);
    } else if (restaurantsByEmail && restaurantsByEmail.length > 0) {
      console.log('\n✅ Found restaurants with this email:');
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
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email);

    if (userError) {
      console.error('❌ Error finding user:', userError);
    } else if (users && users.length > 0) {
      const user = users[0];
      console.log(`\n👤 Found user: ${user.email} (${user.id})`);
      
      // Find restaurants owned by this user
      const { data: userRestaurants, error: userRestaurantError } = await supabase
        .from('restaurants')
        .select('id, name, email, owner_id, is_active, is_verified')
        .eq('owner_id', user.id);

      if (userRestaurantError) {
        console.error('❌ Error finding user restaurants:', userRestaurantError);
      } else if (userRestaurants && userRestaurants.length > 0) {
        console.log('\n🍕 Restaurants owned by this user:');
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

    // Method 3: Check restaurant staff table
    if (users && users.length > 0) {
      const user = users[0];
      const { data: staffRoles, error: staffError } = await supabase
        .from('restaurant_staff')
        .select(`
          restaurant_id,
          role,
          restaurants!inner(id, name, email, is_active, is_verified)
        `)
        .eq('user_id', user.id);

      if (staffError) {
        console.error('❌ Error finding staff roles:', staffError);
      } else if (staffRoles && staffRoles.length > 0) {
        console.log('\n👥 Restaurants where user has staff role:');
        staffRoles.forEach((staff, index) => {
          const restaurant = staff.restaurants;
          console.log(`${index + 1}. ${restaurant.name}`);
          console.log(`   ID: ${restaurant.id}`);
          console.log(`   Role: ${staff.role}`);
          console.log(`   Email: ${restaurant.email || 'Not set'}`);
          console.log(`   Active: ${restaurant.is_active ? '✅' : '❌'}`);
          console.log(`   Verified: ${restaurant.is_verified ? '✅' : '❌'}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
const email = 'nn@gmail.com';
findRestaurantByEmail(email);
