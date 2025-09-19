const https = require('https');

const BASE_URL = 'https://resturant-two-xi.vercel.app';
const RESTAURANT_ID = '64806e5b-714f-4388-a092-29feff9b64c0';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testSectionIdStorage() {
  console.log('🧪 Testing section_id storage and retrieval...\n');

  try {
    // 1. Get existing sections to find a section ID
    console.log('1. Getting existing sections...');
    const sectionsRes = await makeRequest(`${BASE_URL}/dashboard/proxy/menus/sections?restaurant_id=${RESTAURANT_ID}&menu=main`);
    
    if (sectionsRes.status !== 200) {
      console.error('❌ Failed to get sections:', sectionsRes.status, sectionsRes.data);
      return;
    }

    const sections = sectionsRes.data?.sections || sectionsRes.data?.data || sectionsRes.data || [];
    console.log(`✅ Found ${sections.length} sections`);
    
    if (sections.length === 0) {
      console.log('⚠️  No sections found, creating one first...');
      
      // Create a test section
      const createSectionRes = await makeRequest(`${BASE_URL}/dashboard/proxy/menus/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          menu: 'main',
          name: 'Test Section',
          path: ['Test Section']
        })
      });
      
      if (createSectionRes.status !== 201) {
        console.error('❌ Failed to create section:', createSectionRes.status, createSectionRes.data);
        return;
      }
      
      sections.push(createSectionRes.data?.data || createSectionRes.data);
      console.log('✅ Created test section');
    }

    const testSection = sections[0];
    const sectionId = testSection.id;
    const sectionName = testSection.name;
    
    console.log(`📋 Using section: "${sectionName}" (ID: ${sectionId})\n`);

    // 2. Create an item with section_id
    console.log('2. Creating item with section_id...');
    const itemPayload = {
      restaurantId: RESTAURANT_ID,
      menu: 'main',
      name: 'Test Item with Section ID',
      price_cents: 1500,
      currency: 'SEK',
      section_path: [sectionName],
      section_id: sectionId,
      description: 'Test item to verify section_id storage'
    };

    const createRes = await makeRequest(`${BASE_URL}/dashboard/proxy/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemPayload)
    });

    if (createRes.status !== 201) {
      console.error('❌ Failed to create item:', createRes.status, createRes.data);
      return;
    }

    const createdItem = createRes.data?.data || createRes.data;
    console.log('✅ Item created successfully');
    console.log('📦 Created item data:', JSON.stringify(createdItem, null, 2));

    // 3. Verify section_id is returned
    console.log('\n3. Verifying section_id in response...');
    if (createdItem.section_id === sectionId) {
      console.log('✅ section_id correctly returned in response');
    } else {
      console.log('❌ section_id mismatch:');
      console.log(`   Expected: ${sectionId}`);
      console.log(`   Got: ${createdItem.section_id}`);
    }

    // 4. Fetch the item by ID to verify persistence
    console.log('\n4. Fetching item by ID to verify persistence...');
    const fetchRes = await makeRequest(`${BASE_URL}/dashboard/proxy/items/${createdItem.id}`);
    
    if (fetchRes.status !== 200) {
      console.error('❌ Failed to fetch item:', fetchRes.status, fetchRes.data);
      return;
    }

    const fetchedItem = fetchRes.data?.data || fetchRes.data;
    console.log('✅ Item fetched successfully');
    console.log('📦 Fetched item data:', JSON.stringify(fetchedItem, null, 2));

    if (fetchedItem.section_id === sectionId) {
      console.log('✅ section_id correctly persisted and retrieved');
    } else {
      console.log('❌ section_id not persisted correctly:');
      console.log(`   Expected: ${sectionId}`);
      console.log(`   Got: ${fetchedItem.section_id}`);
    }

    // 5. Test listing items to verify section_id appears
    console.log('\n5. Testing item listing with section_id...');
    const listRes = await makeRequest(`${BASE_URL}/dashboard/proxy/items?restaurantId=${RESTAURANT_ID}&menu=main&limit=10`);
    
    if (listRes.status !== 200) {
      console.error('❌ Failed to list items:', listRes.status, listRes.data);
      return;
    }

    const items = listRes.data?.data || listRes.data || [];
    const ourItem = items.find(item => item.id === createdItem.id);
    
    if (ourItem && ourItem.section_id === sectionId) {
      console.log('✅ section_id correctly appears in item listing');
    } else {
      console.log('❌ section_id not found in item listing');
      if (ourItem) {
        console.log(`   Got: ${ourItem.section_id}`);
      } else {
        console.log('   Item not found in listing');
      }
    }

    // 6. Test public API
    console.log('\n6. Testing public API with section_id...');
    const publicRes = await makeRequest(`${BASE_URL}/api/public/menu?restaurantId=${RESTAURANT_ID}&menu=main`);
    
    if (publicRes.status !== 200) {
      console.error('❌ Failed to fetch public menu:', publicRes.status, publicRes.data);
      return;
    }

    const publicItems = publicRes.data?.data || publicRes.data || [];
    const publicItem = publicItems.find(item => item.id === createdItem.id);
    
    if (publicItem && publicItem.section_id === sectionId) {
      console.log('✅ section_id correctly appears in public API');
    } else {
      console.log('❌ section_id not found in public API');
      if (publicItem) {
        console.log(`   Got: ${publicItem.section_id}`);
      } else {
        console.log('   Item not found in public API (might be unavailable)');
      }
    }

    console.log('\n🎉 Section ID storage test completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Item created: ${createdItem.id}`);
    console.log(`   - Section ID: ${sectionId}`);
    console.log(`   - Section name: ${sectionName}`);
    console.log(`   - section_id in create response: ${createdItem.section_id === sectionId ? '✅' : '❌'}`);
    console.log(`   - section_id in fetch response: ${fetchedItem.section_id === sectionId ? '✅' : '❌'}`);
    console.log(`   - section_id in list response: ${ourItem?.section_id === sectionId ? '✅' : '❌'}`);
    console.log(`   - section_id in public API: ${publicItem?.section_id === sectionId ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testSectionIdStorage();
