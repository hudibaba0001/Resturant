#!/usr/bin/env node

// Schema Doctor - Validates database schema integrity
// Run with: node scripts/schema-doctor.mjs

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';

async function runSchemaDoctor() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('🔍 Running schema doctor...');
    
    const checks = [
      checkUniqueConstraint,
      checkRpcFunction,
      checkNotNullConstraints,
      checkPriceConstraints,
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const check of checks) {
      try {
        await check(client);
        console.log(`✅ ${check.name}`);
        passed++;
      } catch (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      process.exit(1);
    }
    
    console.log('🎉 All schema checks passed!');
    
  } catch (error) {
    console.error('💥 Schema doctor failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function checkUniqueConstraint(client) {
  const result = await client.query(`
    SELECT conname, contype 
    FROM pg_constraint 
    WHERE conrelid = 'public.restaurants'::regclass 
    AND conname = 'uniq_owner_name'
  `);
  
  if (result.rows.length === 0) {
    throw new Error('Missing unique constraint on (owner_id, name)');
  }
}

async function checkRpcFunction(client) {
  const result = await client.query(`
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n on n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_restaurant_tenant'
  `);
  
  if (result.rows.length === 0) {
    throw new Error('RPC function create_restaurant_tenant not found');
  }
  
  if (result.rows.length > 1) {
    throw new Error(`Multiple signatures found for create_restaurant_tenant: ${result.rows.map(r => r.args).join(', ')}`);
  }
  
  const expectedArgs = 'p_name text, p_desc text, p_cuisine text, p_address text, p_city text, p_country text';
  if (!result.rows[0].args.includes(expectedArgs.replace(/\s+/g, ''))) {
    throw new Error(`Expected 6-arg signature, got: ${result.rows[0].args}`);
  }
}

async function checkNotNullConstraints(client) {
  const result = await client.query(`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'restaurants'
    AND column_name IN ('address', 'city')
  `);
  
  for (const row of result.rows) {
    if (row.is_nullable === 'YES') {
      throw new Error(`Column ${row.column_name} should be NOT NULL`);
    }
  }
}

async function checkPriceConstraints(client) {
  const result = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'menu_items'
    AND column_name = 'price_cents'
  `);
  
  if (result.rows.length === 0) {
    throw new Error('price_cents column not found in menu_items');
  }
  
  if (result.rows[0].data_type !== 'integer') {
    throw new Error(`price_cents should be integer, got ${result.rows[0].data_type}`);
  }
}

runSchemaDoctor().catch(console.error);
