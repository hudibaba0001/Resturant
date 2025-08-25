const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrdersSchema() {
  try {
    console.log('Checking orders table schema...');
    
    // Get all columns from orders table
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'orders')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (error) {
      console.error('Error fetching schema:', error);
      return;
    }
    
    console.log('Current orders table columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check for specific columns we need
    const requiredColumns = [
      'customer_name', 'phone_e164', 'email', 'pin', 
      'pin_issued_at', 'pin_attempts', 'notification_status', 'picked_up_at'
    ];
    
    const existingColumns = columns.map(c => c.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\nMissing columns:', missingColumns);
    } else {
      console.log('\nAll required columns exist!');
    }
    
  } catch (error) {
    console.error('Schema check error:', error);
  }
}

checkOrdersSchema();
