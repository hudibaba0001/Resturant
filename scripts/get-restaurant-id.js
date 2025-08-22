#!/usr/bin/env node

/**
 * Get Restaurant ID Script
 * 
 * This script helps you find your restaurant ID quickly.
 * 
 * Usage:
 * 1. Set your email below
 * 2. Run: node scripts/get-restaurant-id.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - UPDATE THESE VALUES
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'your-email@example.com'; // Replace with your email

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (get this from Supabase Dashboard > Settings > API)');
  process.exit(1);
}

if (USER_EMAIL === 'your-email@example.com') {
  console.error('❌ Please update USER_EMAIL in this script with your actual email');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getRestaurantId() {
  console.log('🔍 Finding your restaurant...');
  
  try {
    // 1. Find your user
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', USER_EMAIL)
      .limit(1);

    if (userError) {
      console.error('❌ Failed to find user:', userError);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ No user found with email:', USER_EMAIL);
      return;
    }

    const user = users[0];
    console.log(`✅ Found user: ${user.email} (${user.id})`);

    // 2. Find your restaurant
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, is_active, is_verified')
      .eq('owner_id', user.id)
      .limit(5);

    if (restaurantError) {
      console.error('❌ Failed to find restaurants:', restaurantError);
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
      console.log('🎯 Use this Restaurant ID in your activation script:');
      console.log(`   ${restaurants[0].id}`);
    } else {
      console.log('🎯 Choose which restaurant to activate and use its ID in your activation script');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
getRestaurantId();
