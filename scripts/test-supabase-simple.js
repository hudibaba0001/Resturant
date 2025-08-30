#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Testing Supabase connection...');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    console.log('Testing connection...');
    
    // Try a simple query
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase error:', error);
    } else {
      console.log('✅ Connection successful!');
      console.log('Sample data:', data);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();
