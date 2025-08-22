// Debug environment variables
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging environment variables...');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
console.log('📁 .env.local exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('📄 File content (first 200 chars):', content.substring(0, 200));
  
  // Check for specific variables
  const lines = content.split('\n');
  const supabaseUrl = lines.find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_URL='));
  const supabaseKey = lines.find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='));
  
  console.log('🔑 NEXT_PUBLIC_SUPABASE_URL found:', supabaseUrl ? '✅' : '❌');
  console.log('🔑 NEXT_PUBLIC_SUPABASE_ANON_KEY found:', supabaseKey ? '✅' : '❌');
  
  if (supabaseUrl) {
    console.log('URL value:', supabaseUrl.substring(supabaseUrl.indexOf('=') + 1));
  }
  if (supabaseKey) {
    console.log('KEY value:', supabaseKey.substring(supabaseKey.indexOf('=') + 1).substring(0, 20) + '...');
  }
}

// Try loading with dotenv
try {
  require('dotenv').config({ path: '.env.local' });
  console.log('\n📦 After dotenv load:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');
} catch (error) {
  console.log('❌ Dotenv error:', error.message);
}
