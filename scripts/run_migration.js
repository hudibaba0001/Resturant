const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Running orders pickup migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250127_orders_pickup_minimal.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL loaded, executing...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      return;
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the new columns exist
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'orders')
      .in('column_name', ['customer_name', 'phone_e164', 'email', 'pin', 'pin_issued_at', 'pin_attempts', 'notification_status', 'picked_up_at']);
    
    if (columnsError) {
      console.error('Error verifying columns:', columnsError);
      return;
    }
    
    console.log('New columns verified:', columns.map(c => c.column_name));
    
  } catch (error) {
    console.error('Migration script error:', error);
  }
}

runMigration();
