#!/usr/bin/env node

// Smoke test for onboarding flow
// Run with: node scripts/test-onboarding.js

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testOnboarding() {
  console.log('🧪 Testing onboarding flow...');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // 1. Test signup
    console.log('1. Testing signup...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signupError) {
      console.error('❌ Signup failed:', signupError.message);
      return false;
    }
    
    console.log('✅ Signup successful');
    
    // 2. Test RPC function
    console.log('2. Testing RPC function...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_restaurant_tenant', {
      p_name: 'Test Restaurant',
      p_desc: 'A test restaurant',
      p_cuisine: 'Italian',
      p_address: '123 Test St',
      p_city: 'Stockholm',
      p_country: 'SE',
    });
    
    if (rpcError) {
      console.error('❌ RPC failed:', rpcError.message);
      return false;
    }
    
    console.log('✅ RPC successful, restaurant ID:', rpcData);
    
    // 3. Clean up test user
    console.log('3. Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(signupData.user.id);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test user:', deleteError.message);
    } else {
      console.log('✅ Test user cleaned up');
    }
    
    console.log('🎉 All tests passed! Onboarding flow is working.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testOnboarding().then(success => {
  process.exit(success ? 0 : 1);
});
