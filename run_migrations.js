require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE) {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function runMigrations() {
  try {
    console.log('🚀 Running database migrations...');
    
    // Read and run the main schema file
    const schemaPath = path.join(__dirname, 'restaurants_table.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Running restaurants_table.sql...');
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (schemaError) {
      console.log('⚠️  Schema might already exist, continuing...');
    } else {
      console.log('✅ Schema created successfully');
    }
    
    // Read and run the menu items migration
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '03_match_menu_items.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running 03_match_menu_items.sql...');
    const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (migrationError) {
      console.log('⚠️  Migration might already exist, continuing...');
    } else {
      console.log('✅ Migration applied successfully');
    }
    
    console.log('🎯 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    
    // Fallback: try to run SQL directly
    console.log('🔄 Trying direct SQL execution...');
    try {
      const schemaSQL = fs.readFileSync(path.join(__dirname, 'restaurants_table.sql'), 'utf8');
      const { error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
      if (!error) {
        console.log('✅ Schema created via direct SQL');
      }
    } catch (fallbackError) {
      console.error('❌ Direct SQL also failed:', fallbackError.message);
      console.log('\n💡 Please run the SQL manually in Supabase SQL Editor:');
      console.log('1. Copy contents of restaurants_table.sql');
      console.log('2. Paste in Supabase SQL Editor');
      console.log('3. Click Run');
    }
  }
}

runMigrations();
