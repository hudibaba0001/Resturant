const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Common table names to try
const commonTables = [
  'users',
  'profiles',
  'restaurants',
  'menu_items',
  'orders',
  'order_items',
  'widget_sessions',
  'widget_configs',
  'payments',
  'subscriptions',
  'settings',
  'logs',
  'analytics',
  'notifications',
  'categories',
  'allergens',
  'ingredients',
  'staff',
  'customers',
  'addresses',
  'deliveries',
  'reviews',
  'ratings',
  'promotions',
  'discounts',
  'taxes',
  'shipping',
  'inventory',
  'suppliers',
  'products'
];

async function discoverTables() {
  try {
    console.log('🔍 Discovering tables in your Supabase database...\n');
    
    const discoveredTables = [];
    const tableSchemas = {};

    for (const tableName of commonTables) {
      try {
        console.log(`🔍 Checking table: ${tableName}`);
        
        // Try to get a single row to see if table exists
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error && data !== null) {
          console.log(`✅ Found table: ${tableName}`);
          discoveredTables.push(tableName);
          
          // Try to get more info about the table structure
          try {
            const { data: sample, error: sampleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(3);
            
            if (!sampleError && sample && sample.length > 0) {
              // Extract column names from the first row
              const columns = Object.keys(sample[0]);
              tableSchemas[tableName] = {
                columns: columns,
                sampleData: sample,
                rowCount: sample.length
              };
              console.log(`   📝 Columns: ${columns.join(', ')}`);
            }
          } catch (schemaError) {
            console.log(`   ⚠️ Could not get schema for ${tableName}: ${schemaError.message}`);
          }
        } else {
          console.log(`❌ Table not found: ${tableName}`);
        }
      } catch (error) {
        console.log(`❌ Error checking ${tableName}: ${error.message}`);
      }
    }

    // Also try some system tables that might be accessible
    const systemTables = [
      'pg_tables',
      'pg_stat_user_tables',
      'pg_class',
      'pg_namespace'
    ];

    console.log('\n🔍 Checking system tables...');
    for (const tableName of systemTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error && data !== null) {
          console.log(`✅ Found system table: ${tableName}`);
          discoveredTables.push(tableName);
        }
      } catch (error) {
        // System tables usually fail, that's expected
      }
    }

    // Write results to file
    const outputPath = path.join(__dirname, '..', 'discovered-tables.json');
    const results = {
      discoveredTables,
      tableSchemas,
      timestamp: new Date().toISOString(),
      totalTables: discoveredTables.length
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log(`\n✅ Discovery complete! Found ${discoveredTables.length} tables.`);
    console.log(`📁 Results saved to: ${outputPath}`);
    
    // Create a readable summary
    const summaryPath = path.join(__dirname, '..', 'discovered-tables-summary.txt');
    let summary = 'DISCOVERED TABLES SUMMARY\n';
    summary += '==========================\n\n';
    summary += `Total tables found: ${discoveredTables.length}\n\n`;
    
    if (discoveredTables.length > 0) {
      summary += 'TABLES:\n';
      discoveredTables.forEach(table => {
        summary += `  - ${table}\n`;
      });
      summary += '\n';
    }

    if (Object.keys(tableSchemas).length > 0) {
      summary += 'TABLE SCHEMAS:\n';
      Object.keys(tableSchemas).forEach(tableName => {
        const schema = tableSchemas[tableName];
        summary += `  ${tableName}:\n`;
        summary += `    Columns: ${schema.columns.join(', ')}\n`;
        summary += `    Sample rows: ${schema.rowCount}\n`;
        summary += '\n';
      });
    }

    fs.writeFileSync(summaryPath, summary);
    console.log(`📝 Summary written to: ${summaryPath}`);

    return results;

  } catch (error) {
    console.error('❌ Error discovering tables:', error);
    process.exit(1);
  }
}

// Run the discovery
discoverTables();
