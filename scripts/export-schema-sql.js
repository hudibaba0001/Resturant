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

async function exportSchemaSQL() {
  try {
    console.log('🔍 Exporting complete Supabase schema using SQL...');
    
    const schema = {};

    // 1. Get all tables in public schema
    console.log('📋 Fetching tables...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            table_name,
            table_type
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `
      });

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      schema.tables = tables || [];
      console.log(`📋 Found ${schema.tables.length} tables`);
    }

    // 2. Get all columns
    console.log('📝 Fetching columns...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns 
          WHERE table_schema = 'public'
          ORDER BY table_name, ordinal_position;
        `
      });

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
    } else {
      schema.columns = columns || [];
      console.log(`📝 Found ${schema.columns.length} columns`);
    }

    // 3. Get all constraints
    console.log('🔗 Fetching constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          LEFT JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          LEFT JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.table_schema = 'public'
          ORDER BY tc.table_name, tc.constraint_name;
        `
      });

    if (constraintsError) {
      console.error('Error fetching constraints:', constraintsError);
    } else {
      schema.constraints = constraints || [];
      console.log(`🔗 Found ${schema.constraints.length} constraints`);
    }

    // 4. Get all indexes
    console.log('📊 Fetching indexes...');
    const { data: indexes, error: indexesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE schemaname = 'public'
          ORDER BY tablename, indexname;
        `
      });

    if (indexesError) {
      console.error('Error fetching indexes:', indexesError);
    } else {
      schema.indexes = indexes || [];
      console.log(`📊 Found ${schema.indexes.length} indexes`);
    }

    // 5. Get all functions
    console.log('⚙️ Fetching functions...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            routine_name,
            routine_type,
            data_type,
            routine_definition
          FROM information_schema.routines 
          WHERE routine_schema = 'public'
          ORDER BY routine_name;
        `
      });

    if (functionsError) {
      console.error('Error fetching functions:', functionsError);
    } else {
      schema.functions = functions || [];
      console.log(`⚙️ Found ${schema.functions.length} functions`);
    }

    // 6. Get all policies
    console.log('🔒 Fetching RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname;
        `
      });

    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
    } else {
      schema.policies = policies || [];
      console.log(`🔒 Found ${schema.policies.length} policies`);
    }

    // 7. Get all triggers
    console.log('🎯 Fetching triggers...');
    const { data: triggers, error: triggersError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            trigger_name,
            event_manipulation,
            event_object_table,
            action_timing,
            action_statement
          FROM information_schema.triggers 
          WHERE trigger_schema = 'public'
          ORDER BY event_object_table, trigger_name;
        `
      });

    if (triggersError) {
      console.error('Error fetching triggers:', triggersError);
    } else {
      schema.triggers = triggers || [];
      console.log(`🎯 Found ${schema.triggers.length} triggers`);
    }

    // 8. Get all views
    console.log('👁️ Fetching views...');
    const { data: views, error: viewsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            table_name,
            view_definition
          FROM information_schema.views 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `
      });

    if (viewsError) {
      console.error('Error fetching views:', viewsError);
    } else {
      schema.views = views || [];
      console.log(`👁️ Found ${schema.views.length} views`);
    }

    // 9. Get all enums
    console.log('📝 Fetching enums...');
    const { data: enums, error: enumsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            t.typname AS enum_name,
            e.enumlabel AS enum_value
          FROM pg_type t 
          JOIN pg_enum e ON t.oid = e.enumtypid  
          JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public'
          ORDER BY t.typname, e.enumsortorder;
        `
      });

    if (enumsError) {
      console.error('Error fetching enums:', enumsError);
    } else {
      schema.enums = enums || [];
      console.log(`📝 Found ${schema.enums.length} enum values`);
    }

    // Write to file
    const outputPath = path.join(__dirname, '..', 'supabase-schema-complete.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
    
    console.log(`\n✅ Complete schema exported to: ${outputPath}`);
    console.log(`📊 Summary:`);
    console.log(`   Tables: ${schema.tables?.length || 0}`);
    console.log(`   Columns: ${schema.columns?.length || 0}`);
    console.log(`   Constraints: ${schema.constraints?.length || 0}`);
    console.log(`   Indexes: ${schema.indexes?.length || 0}`);
    console.log(`   Functions: ${schema.functions?.length || 0}`);
    console.log(`   Policies: ${schema.policies?.length || 0}`);
    console.log(`   Triggers: ${schema.triggers?.length || 0}`);
    console.log(`   Views: ${schema.views?.length || 0}`);
    console.log(`   Enum values: ${schema.enums?.length || 0}`);

  } catch (error) {
    console.error('❌ Error exporting schema:', error);
    
    // Fallback: Try to get basic table info
    console.log('\n🔄 Trying fallback method...');
    try {
      const { data: basicTables, error: basicError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public');

      if (!basicError && basicTables) {
        const fallbackPath = path.join(__dirname, '..', 'supabase-schema-basic.json');
        fs.writeFileSync(fallbackPath, JSON.stringify({ tables: basicTables }, null, 2));
        console.log(`✅ Basic schema exported to: ${fallbackPath}`);
        console.log(`📋 Found ${basicTables.length} tables`);
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
    
    process.exit(1);
  }
}

// Run the export
console.log('🚀 Starting complete schema export...\n');
exportSchemaSQL();
