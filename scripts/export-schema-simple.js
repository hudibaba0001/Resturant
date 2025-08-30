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

async function exportSchemaSimple() {
  try {
    console.log('🔍 Exporting Supabase schema using direct queries...');
    
    const schema = {};

    // 1. Get all tables in public schema
    console.log('📋 Fetching tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      schema.tables = tables || [];
      console.log(`📋 Found ${schema.tables.length} tables`);
    }

    // 2. Get all columns
    console.log('📝 Fetching columns...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
    } else {
      schema.columns = columns || [];
      console.log(`📝 Found ${schema.columns.length} columns`);
    }

    // 3. Get all constraints
    console.log('🔗 Fetching constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('table_name, constraint_name, constraint_type')
      .eq('table_schema', 'public');

    if (constraintsError) {
      console.error('Error fetching constraints:', constraintsError);
    } else {
      schema.constraints = constraints || [];
      console.log(`🔗 Found ${schema.constraints.length} constraints`);
    }

    // 4. Get all indexes (using pg_indexes view)
    console.log('📊 Fetching indexes...');
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('tablename, indexname, indexdef')
      .eq('schemaname', 'public');

    if (indexesError) {
      console.error('Error fetching indexes:', indexesError);
    } else {
      schema.indexes = indexes || [];
      console.log(`📊 Found ${schema.indexes.length} indexes`);
    }

    // 5. Get all functions
    console.log('⚙️ Fetching functions...');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, data_type')
      .eq('routine_schema', 'public');

    if (functionsError) {
      console.error('Error fetching functions:', functionsError);
    } else {
      schema.functions = functions || [];
      console.log(`⚙️ Found ${schema.functions.length} functions`);
    }

    // 6. Get all policies (using pg_policies view)
    console.log('🔒 Fetching RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, permissive, roles, cmd')
      .eq('schemaname', 'public');

    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
    } else {
      schema.policies = policies || [];
      console.log(`🔒 Found ${schema.policies.length} policies`);
    }

    // 7. Get all triggers
    console.log('🎯 Fetching triggers...');
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, event_object_table, action_timing')
      .eq('trigger_schema', 'public');

    if (triggersError) {
      console.error('Error fetching triggers:', triggersError);
    } else {
      schema.triggers = triggers || [];
      console.log(`🎯 Found ${schema.triggers.length} triggers`);
    }

    // 8. Get all views
    console.log('👁️ Fetching views...');
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public');

    if (viewsError) {
      console.error('Error fetching views:', viewsError);
    } else {
      schema.views = views || [];
      console.log(`👁️ Found ${schema.views.length} views`);
    }

    // 9. Get table data samples (first few rows of each table)
    console.log('📊 Fetching table data samples...');
    schema.tableSamples = {};
    
    for (const table of schema.tables || []) {
      try {
        const { data: sample, error: sampleError } = await supabase
          .from(table.table_name)
          .select('*')
          .limit(3);
        
        if (!sampleError && sample) {
          schema.tableSamples[table.table_name] = sample;
        }
      } catch (error) {
        console.log(`⚠️ Could not sample table ${table.table_name}: ${error.message}`);
      }
    }

    // Write to file
    const outputPath = path.join(__dirname, '..', 'supabase-schema-simple.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
    
    console.log(`\n✅ Schema exported to: ${outputPath}`);
    console.log(`📊 Summary:`);
    console.log(`   Tables: ${schema.tables?.length || 0}`);
    console.log(`   Columns: ${schema.columns?.length || 0}`);
    console.log(`   Constraints: ${schema.constraints?.length || 0}`);
    console.log(`   Indexes: ${schema.indexes?.length || 0}`);
    console.log(`   Functions: ${schema.functions?.length || 0}`);
    console.log(`   Policies: ${schema.policies?.length || 0}`);
    console.log(`   Triggers: ${schema.triggers?.length || 0}`);
    console.log(`   Views: ${schema.views?.length || 0}`);
    console.log(`   Table samples: ${Object.keys(schema.tableSamples || {}).length}`);

    // Also create a readable summary
    const summaryPath = path.join(__dirname, '..', 'supabase-schema-summary.txt');
    let summary = 'SUPABASE SCHEMA SUMMARY\n';
    summary += '======================\n\n';
    
    if (schema.tables?.length > 0) {
      summary += 'TABLES:\n';
      schema.tables.forEach(table => {
        summary += `  - ${table.table_name}\n`;
      });
      summary += '\n';
    }

    if (schema.columns?.length > 0) {
      summary += 'COLUMNS BY TABLE:\n';
      const columnsByTable = {};
      schema.columns.forEach(col => {
        if (!columnsByTable[col.table_name]) {
          columnsByTable[col.table_name] = [];
        }
        columnsByTable[col.table_name].push(col);
      });
      
      Object.keys(columnsByTable).forEach(tableName => {
        summary += `  ${tableName}:\n`;
        columnsByTable[tableName].forEach(col => {
          summary += `    - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}\n`;
        });
        summary += '\n';
      });
    }

    if (schema.policies?.length > 0) {
      summary += 'RLS POLICIES:\n';
      schema.policies.forEach(policy => {
        summary += `  - ${policy.tablename}.${policy.policyname}: ${policy.cmd}\n`;
      });
      summary += '\n';
    }

    fs.writeFileSync(summaryPath, summary);
    console.log(`📝 Readable summary written to: ${summaryPath}`);

  } catch (error) {
    console.error('❌ Error exporting schema:', error);
    process.exit(1);
  }
}

// Run the export
console.log('🚀 Starting simple schema export...\n');
exportSchemaSimple();
