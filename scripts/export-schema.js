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

async function exportSchema() {
  try {
    console.log('🔍 Exporting complete Supabase schema...');
    
    const schema = {
      tables: [],
      functions: [],
      policies: [],
      indexes: [],
      triggers: [],
      views: [],
      enums: [],
      extensions: []
    };

    // 1. Get all tables
    console.log('📋 Fetching tables...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_info', { schema_name: 'public' });
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      schema.tables = tables || [];
    }

    // 2. Get table definitions
    console.log('📝 Fetching table definitions...');
    const { data: tableDefs, error: tableDefsError } = await supabase
      .rpc('get_table_definitions');
    
    if (tableDefsError) {
      console.error('Error fetching table definitions:', tableDefsError);
    } else {
      schema.tableDefinitions = tableDefs || [];
    }

    // 3. Get functions
    console.log('⚙️ Fetching functions...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_functions', { schema_name: 'public' });
    
    if (functionsError) {
      console.error('Error fetching functions:', functionsError);
    } else {
      schema.functions = functions || [];
    }

    // 4. Get policies
    console.log('🔒 Fetching RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies');
    
    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
    } else {
      schema.policies = policies || [];
    }

    // 5. Get indexes
    console.log('📊 Fetching indexes...');
    const { data: indexes, error: indexesError } = await supabase
      .rpc('get_indexes', { schema_name: 'public' });
    
    if (indexesError) {
      console.error('Error fetching indexes:', indexesError);
    } else {
      schema.indexes = indexes || [];
    }

    // 6. Get triggers
    console.log('🎯 Fetching triggers...');
    const { data: triggers, error: triggersError } = await supabase
      .rpc('get_triggers', { schema_name: 'public' });
    
    if (triggersError) {
      console.error('Error fetching triggers:', triggersError);
    } else {
      schema.triggers = triggers || [];
    }

    // 7. Get views
    console.log('👁️ Fetching views...');
    const { data: views, error: viewsError } = await supabase
      .rpc('get_views', { schema_name: 'public' });
    
    if (viewsError) {
      console.error('Error fetching views:', viewsError);
    } else {
      schema.views = views || [];
    }

    // 8. Get enums
    console.log('📝 Fetching enums...');
    const { data: enums, error: enumsError } = await supabase
      .rpc('get_enums', { schema_name: 'public' });
    
    if (enumsError) {
      console.error('Error fetching enums:', enumsError);
    } else {
      schema.enums = enums || [];
    }

    // 9. Get extensions
    console.log('🔌 Fetching extensions...');
    const { data: extensions, error: extensionsError } = await supabase
      .rpc('get_extensions');
    
    if (extensionsError) {
      console.error('Error fetching extensions:', extensionsError);
    } else {
      schema.extensions = extensions || [];
    }

    // Write to file
    const outputPath = path.join(__dirname, '..', 'supabase-schema.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
    
    console.log(`✅ Schema exported to: ${outputPath}`);
    console.log(`📊 Summary:`);
    console.log(`   Tables: ${schema.tables.length}`);
    console.log(`   Functions: ${schema.functions.length}`);
    console.log(`   Policies: ${schema.policies.length}`);
    console.log(`   Indexes: ${schema.indexes.length}`);
    console.log(`   Triggers: ${schema.triggers.length}`);
    console.log(`   Views: ${schema.views.length}`);
    console.log(`   Enums: ${schema.enums.length}`);
    console.log(`   Extensions: ${schema.extensions.length}`);

  } catch (error) {
    console.error('❌ Error exporting schema:', error);
    process.exit(1);
  }
}

// Alternative: Use direct SQL queries if RPC functions don't exist
async function exportSchemaDirect() {
  try {
    console.log('🔍 Exporting schema using direct SQL queries...');
    
    const schema = {};

    // Get table information
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (!tablesError && tables) {
      schema.tables = tables;
      console.log(`📋 Found ${tables.length} tables`);
    }

    // Get column information
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_schema', 'public');

    if (!columnsError && columns) {
      schema.columns = columns;
      console.log(`📝 Found ${columns.length} columns`);
    }

    // Get constraint information
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_schema', 'public');

    if (!constraintsError && constraints) {
      schema.constraints = constraints;
      console.log(`🔗 Found ${constraints.length} constraints`);
    }

    // Get index information
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('*')
      .eq('schemaname', 'public');

    if (!indexesError && indexes) {
      schema.indexes = indexes;
      console.log(`📊 Found ${indexes.length} indexes`);
    }

    // Write to file
    const outputPath = path.join(__dirname, '..', 'supabase-schema-direct.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
    
    console.log(`✅ Schema exported to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error exporting schema:', error);
    process.exit(1);
  }
}

// Run both methods
async function main() {
  console.log('🚀 Starting schema export...\n');
  
  try {
    await exportSchema();
  } catch (error) {
    console.log('⚠️ RPC method failed, trying direct SQL...\n');
    await exportSchemaDirect();
  }
  
  console.log('\n🎉 Schema export complete!');
}

main();
