const fs = require('fs');
const path = require('path');

console.log('🚀 Database Setup Guide');
console.log('=======================\n');

console.log('📋 Step 1: Run Schema Migration');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the following SQL:\n');

// Read and display the schema
const schemaPath = path.join(__dirname, 'restaurants_table.sql');
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
console.log(schemaSQL);

console.log('\n📋 Step 2: Run Menu Items Migration');
console.log('1. In the same SQL Editor, run this migration:\n');

// Read and display the migration
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '03_match_menu_items.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
console.log(migrationSQL);

console.log('\n📋 Step 3: Create Demo Data');
console.log('After running the migrations above, run this script:');
console.log('node create_demo_data.js');

console.log('\n🎯 Once complete, you can run the smoke tests!');
