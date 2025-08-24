const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportSchema() {
  console.log('🔍 Exporting Supabase Schema and Data...\n');

  // List of tables we expect to exist
  const expectedTables = [
    'restaurants',
    'cuisines', 
    'restaurant_staff',
    'restaurant_cuisines',
    'widget_sessions',
    'chat_messages',
    'chat_response_cache',
    'menu_snapshots',
    'widget_events'
  ];

  try {
    console.log('📋 Checking Tables:');
    
    for (const tableName of expectedTables) {
      try {
        // Try to get sample data from each table
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);

        if (error) {
          console.log(`  ❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`  ✅ ${tableName}: ${data.length} rows found`);
          if (data.length > 0) {
            console.log(`     Sample data:`, JSON.stringify(data[0], null, 4));
          }
        }
      } catch (err) {
        console.log(`  ❌ ${tableName}: Table not found or access denied`);
      }
    }

    // Check for restaurants specifically
    console.log('\n🍽️ Restaurant Data:');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(5);

    if (restaurantsError) {
      console.log('  Error:', restaurantsError.message);
    } else {
      console.log(`  Found ${restaurants.length} restaurants:`);
      restaurants.forEach((restaurant, index) => {
        console.log(`    ${index + 1}. ${restaurant.name} (${restaurant.id})`);
        console.log(`       Active: ${restaurant.is_active}, Verified: ${restaurant.is_verified}`);
      });
    }

    // Check for cuisines
    console.log('\n🍕 Cuisine Data:');
    const { data: cuisines, error: cuisinesError } = await supabase
      .from('cuisines')
      .select('*');

    if (cuisinesError) {
      console.log('  Error:', cuisinesError.message);
    } else {
      console.log(`  Found ${cuisines.length} cuisines:`);
      cuisines.forEach(cuisine => {
        console.log(`    - ${cuisine.name}: ${cuisine.description}`);
      });
    }

    // Check widget data spine tables
    console.log('\n📊 Widget Data Spine:');
    const spineTables = ['widget_sessions', 'chat_messages', 'chat_response_cache', 'widget_events'];
    
    for (const table of spineTables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: Table exists`);
      }
    }

    console.log('\n✅ Export completed!');

  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

exportSchema();
