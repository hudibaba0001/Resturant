const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadFullSchema() {
  console.log('🔍 Downloading Full Supabase Schema and Data...\n');

  const allTables = [
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

  const schemaData = {
    timestamp: new Date().toISOString(),
    project_url: supabaseUrl,
    tables: {}
  };

  try {
    for (const tableName of allTables) {
      console.log(`📋 Processing table: ${tableName}`);
      
      try {
        // Get all data from table
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          console.log(`  ❌ Error: ${error.message}`);
          schemaData.tables[tableName] = {
            error: error.message,
            data: []
          };
        } else {
          console.log(`  ✅ Found ${data.length} rows`);
          schemaData.tables[tableName] = {
            row_count: data.length,
            data: data
          };
        }
      } catch (err) {
        console.log(`  ❌ Table not accessible: ${err.message}`);
        schemaData.tables[tableName] = {
          error: err.message,
          data: []
        };
      }
    }

    // Save to JSON file
    const jsonFilename = `supabase_full_schema_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(schemaData, null, 2));
    console.log(`\n💾 Full schema saved to: ${jsonFilename}`);

    // Create CSV summary
    const csvFilename = `supabase_table_summary_${new Date().toISOString().split('T')[0]}.csv`;
    let csvContent = 'table_name,row_count,status,error\n';
    
    Object.entries(schemaData.tables).forEach(([tableName, tableData]) => {
      const rowCount = tableData.row_count || 0;
      const status = tableData.error ? 'ERROR' : 'OK';
      const error = tableData.error || '';
      csvContent += `"${tableName}",${rowCount},"${status}","${error}"\n`;
    });
    
    fs.writeFileSync(csvFilename, csvContent);
    console.log(`📊 Table summary saved to: ${csvFilename}`);

    // Create detailed table structure
    const structureFilename = `supabase_table_structure_${new Date().toISOString().split('T')[0]}.txt`;
    let structureContent = `SUPABASE DATABASE STRUCTURE\n`;
    structureContent += `Generated: ${new Date().toISOString()}\n`;
    structureContent += `Project: ${supabaseUrl}\n\n`;

    Object.entries(schemaData.tables).forEach(([tableName, tableData]) => {
      structureContent += `TABLE: ${tableName}\n`;
      structureContent += `Rows: ${tableData.row_count || 0}\n`;
      
      if (tableData.error) {
        structureContent += `Status: ERROR - ${tableData.error}\n`;
      } else {
        structureContent += `Status: OK\n`;
        
        if (tableData.data && tableData.data.length > 0) {
          // Show column structure from first row
          const firstRow = tableData.data[0];
          structureContent += `Columns:\n`;
          Object.keys(firstRow).forEach(column => {
            const value = firstRow[column];
            const type = typeof value;
            const sample = value === null ? 'NULL' : 
                          typeof value === 'object' ? 'JSON' : 
                          String(value).substring(0, 50);
            structureContent += `  - ${column}: ${type} (sample: ${sample})\n`;
          });
          
          // Show sample data
          structureContent += `Sample Data:\n`;
          structureContent += JSON.stringify(tableData.data.slice(0, 2), null, 2);
        }
      }
      structureContent += `\n${'='.repeat(50)}\n\n`;
    });

    fs.writeFileSync(structureFilename, structureContent);
    console.log(`📋 Detailed structure saved to: ${structureFilename}`);

    // Print summary
    console.log('\n📊 SUMMARY:');
    Object.entries(schemaData.tables).forEach(([tableName, tableData]) => {
      const status = tableData.error ? '❌' : '✅';
      const count = tableData.row_count || 0;
      console.log(`  ${status} ${tableName}: ${count} rows`);
    });

    console.log('\n✅ Full schema download completed!');
    console.log(`📁 Files created:`);
    console.log(`   - ${jsonFilename} (complete data)`);
    console.log(`   - ${csvFilename} (table summary)`);
    console.log(`   - ${structureFilename} (detailed structure)`);

  } catch (error) {
    console.error('❌ Download failed:', error);
  }
}

downloadFullSchema();
