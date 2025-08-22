#!/usr/bin/env node

/**
 * Verify Restaurant Activation Script
 * 
 * This script verifies that your restaurant activation worked correctly.
 * 
 * Usage:
 * 1. Update the BASE_URL and RESTAURANT_ID below
 * 2. Run: node scripts/verify-activation.js
 */

// Configuration - UPDATE THESE VALUES
const BASE_URL = 'https://your-vercel-domain.vercel.app'; // Replace with your Vercel domain
const RESTAURANT_ID = 'YOUR-RESTAURANT-ID-HERE'; // Replace with your restaurant ID

if (BASE_URL === 'https://your-vercel-domain.vercel.app') {
  console.error('❌ Please update BASE_URL with your actual Vercel domain');
  process.exit(1);
}

if (RESTAURANT_ID === 'YOUR-RESTAURANT-ID-HERE') {
  console.error('❌ Please update RESTAURANT_ID with your actual restaurant ID');
  process.exit(1);
}

async function verifyActivation() {
  console.log('🔍 Verifying restaurant activation...\n');

  try {
    // 1. Check Status API
    console.log('📊 Checking Status API...');
    const statusResponse = await fetch(`${BASE_URL}/api/public/status?restaurantId=${RESTAURANT_ID}`);
    const statusData = await statusResponse.json();
    
    if (statusResponse.ok) {
      console.log(`✅ Status API: ${JSON.stringify(statusData)}`);
    } else {
      console.log(`❌ Status API failed: ${statusResponse.status} - ${JSON.stringify(statusData)}`);
    }

    // 2. Check Menu API
    console.log('\n🍕 Checking Menu API...');
    const menuResponse = await fetch(`${BASE_URL}/api/public/menu?restaurantId=${RESTAURANT_ID}`);
    const menuData = await menuResponse.json();
    
    if (menuResponse.ok) {
      console.log(`✅ Menu API: Found ${menuData.length || 0} items`);
      if (menuData.length > 0) {
        console.log('   Items:');
        menuData.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.name} - ${item.price_cents / 100} SEK`);
        });
      }
    } else {
      console.log(`❌ Menu API failed: ${menuResponse.status} - ${JSON.stringify(menuData)}`);
    }

    // 3. Check Debug Dashboard API (if logged in)
    console.log('\n🔧 Checking Debug Dashboard API...');
    const debugResponse = await fetch(`${BASE_URL}/api/debug/dashboard`);
    const debugData = await debugResponse.json();
    
    if (debugResponse.ok) {
      console.log(`✅ Debug API: ${debugData.ok ? 'Authenticated' : 'Not authenticated'}`);
      if (debugData.ok) {
        console.log(`   User: ${debugData.user.email}`);
        console.log(`   Owned restaurants: ${debugData.owned?.length || 0}`);
        console.log(`   Staff roles: ${debugData.staff?.length || 0}`);
      }
    } else {
      console.log(`❌ Debug API failed: ${debugResponse.status}`);
    }

    // 4. Summary
    console.log('\n📋 Summary:');
    if (statusResponse.ok && menuResponse.ok) {
      console.log('✅ Restaurant activation successful!');
      console.log('✅ Status API working');
      console.log('✅ Menu API working');
      console.log('✅ Widget should be functional');
      
      console.log('\n🎯 Next steps:');
      console.log('1. Go to your dashboard → Embed page');
      console.log('2. The yellow warning should be gone');
      console.log('3. Try the widget preview');
      console.log('4. Test chat and ordering features');
    } else {
      console.log('❌ Some APIs are not working correctly');
      console.log('💡 Check the troubleshooting guide in ACTIVATION_GUIDE.md');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('💡 Make sure your Vercel domain is correct and the app is deployed');
  }
}

// Run the verification
verifyActivation();
