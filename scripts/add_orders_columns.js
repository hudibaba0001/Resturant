const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addOrdersColumns() {
  try {
    console.log('Adding orders pickup columns...');
    
    // Add columns one by one
    const columns = [
      'customer_name text',
      'phone_e164 text', 
      'email text',
      'pin text check (char_length(pin)=4)',
      'pin_issued_at timestamptz',
      'pin_attempts int default 0',
      'notification_status jsonb default \'{}\'::jsonb',
      'picked_up_at timestamptz'
    ];
    
    for (const column of columns) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: `alter table orders add column if not exists ${column};` 
        });
        
        if (error) {
          console.log(`Column ${column.split(' ')[0]} already exists or error:`, error.message);
        } else {
          console.log(`Added column: ${column.split(' ')[0]}`);
        }
      } catch (err) {
        console.log(`Skipping ${column.split(' ')[0]}:`, err.message);
      }
    }
    
    // Add indexes
    const indexes = [
      'create index if not exists idx_orders_phone on orders(phone_e164);',
      'create index if not exists idx_orders_status on orders(status);',
      'create index if not exists idx_orders_pin on orders(pin) where pin is not null;'
    ];
    
    for (const index of indexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: index });
        if (error) {
          console.log('Index creation error:', error.message);
        } else {
          console.log('Index created successfully');
        }
      } catch (err) {
        console.log('Index creation skipped:', err.message);
      }
    }
    
    console.log('Orders columns migration completed!');
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

addOrdersColumns();
