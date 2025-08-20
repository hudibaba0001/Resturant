#!/usr/bin/env node

// Setup script for Widget v1 demo
// Run this after copying the SQL commands to Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('❌ Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRole ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

const RESTAURANT_ID = 'bc19346b-72fb-423e-a77d-36ae8ffe0d95';

async function setupWidgetDemo() {
  console.log('🔧 Setting up Widget v1 demo...\n');

  try {
    // 1. Test if the function exists
    console.log('1️⃣ Testing restaurant status function...');
    const { data: statusData, error: statusError } = await supabase.rpc('is_restaurant_open', {
      p_restaurant_id: RESTAURANT_ID
    });

    if (statusError) {
      console.log('❌ Function not found. Please run the SQL migration first:');
      console.log('   Copy the contents of supabase/migrations/2025-08-20_restaurant_status.sql');
      console.log('   and paste it in your Supabase SQL Editor.\n');
      return;
    }

    console.log(`✅ Status function works: ${statusData ? 'OPEN' : 'CLOSED'}\n`);

    // 2. Create menu section if it doesn't exist
    console.log('2️⃣ Creating menu section...');
    
    // First check if section already exists
    const { data: existingSection } = await supabase
      .from('menu_sections')
      .select('id')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('name', 'Mains')
      .single();

    let sectionId;
    if (existingSection) {
      sectionId = existingSection.id;
      console.log(`✅ Menu section already exists: ${sectionId}\n`);
    } else {
      const { data: sectionData, error: sectionError } = await supabase
        .from('menu_sections')
        .insert({
          restaurant_id: RESTAURANT_ID,
          name: 'Mains',
          position: 0
        })
        .select('id')
        .single();

      if (sectionError) {
        console.error('❌ Error creating section:', sectionError);
        return;
      }

      sectionId = sectionData.id;
      console.log(`✅ Menu section created: ${sectionId}\n`);
    }

    // 3. Link items to the section by setting category to section name
    console.log('3️⃣ Linking menu items to section...');
    const { data: itemsData, error: itemsError } = await supabase
      .from('menu_items')
      .update({ 
        category: 'Mains',  // Use category instead of section_id
        is_available: true 
      })
      .eq('restaurant_id', RESTAURANT_ID)
      .select('id, name, category, is_available');

    if (itemsError) {
      console.error('❌ Error updating items:', itemsError);
      return;
    }

    console.log(`✅ Updated ${itemsData.length} menu items\n`);

    // 4. Verify the setup
    console.log('4️⃣ Verifying setup...');
    
    // Check status
    const { data: finalStatus } = await supabase.rpc('is_restaurant_open', {
      p_restaurant_id: RESTAURANT_ID
    });
    console.log(`   Status: ${finalStatus ? 'OPEN' : 'CLOSED'}`);

    // Check menu items
    const { data: finalItems } = await supabase
      .from('menu_items')
      .select('name, category, is_available')
      .eq('restaurant_id', RESTAURANT_ID);
    
    console.log(`   Menu items: ${finalItems.length} (${finalItems.filter(i => i.is_available).length} available)`);
    console.log(`   Items with categories: ${finalItems.filter(i => i.category).length}`);

    console.log('\n🎉 Widget demo setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the APIs:');
    console.log(`   curl "http://localhost:3002/api/public/status?restaurantId=${RESTAURANT_ID}"`);
    console.log(`   curl "http://localhost:3002/api/public/menu?restaurantId=${RESTAURANT_ID}"`);
    console.log('\n2. Open the demo page:');
    console.log('   http://localhost:3002/test-widget.html');
    console.log('\n3. Try the widget functionality!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupWidgetDemo();
