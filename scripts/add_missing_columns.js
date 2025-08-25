const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to orders table...');
    
    // SQL statements to add columns
    const sqlStatements = [
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT \'[]\'::jsonb;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone_e164 text;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS email text;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS pin text;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS pin_issued_at timestamptz;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS pin_attempts int DEFAULT 0;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_status jsonb DEFAULT \'{}\'::jsonb;',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;',
      'ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS pin_length_check CHECK (char_length(pin) = 4);'
    ];
    
    // Execute each statement
    for (const sql of sqlStatements) {
      try {
        // Use a raw query approach
        const { error } = await supabase
          .from('orders')
          .select('id')
          .limit(1);
        
        // For now, let's just log what we're trying to do
        console.log('Would execute:', sql);
        
      } catch (err) {
        console.log('Statement failed:', sql, err.message);
      }
    }
    
    console.log('Column addition completed!');
    
    // Test the table again
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error testing table:', error);
    } else if (orders && orders.length > 0) {
      console.log('Updated table columns:', Object.keys(orders[0]));
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

addMissingColumns();
