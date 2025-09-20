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

async function testUIIntegration() {
  console.log('🎯 Testing UI Integration (simulating form submission)...\n');

  try {
    // 1. Get a real section ID
    console.log('1. Getting real section...');
    const sectionsRes = await makeRequest(`${BASE_URL}/dashboard/proxy/menus/sections?restaurant_id=${RESTAURANT_ID}&menu=main`);
    const sections = sectionsRes.data?.sections || [];
    const testSection = sections[0];
    
    if (!testSection) {
      console.error('❌ No sections found');
      return;
    }
    
    console.log(`✅ Using section: "${testSection.name}" (ID: ${testSection.id})`);

    // 2. Simulate UI form submission with correct payload
    console.log('\n2. Simulating UI form submission...');
    const uiPayload = {
      restaurantId: RESTAURANT_ID,
      menu: 'main',  // This maps to 'category' in DB
      name: 'UI Test Item',
      price_cents: 2500,
      currency: 'SEK',
      section_path: [testSection.name],
      section_id: testSection.id,
      description: 'Test item created via UI simulation',
      is_available: true
    };

    console.log('📤 UI Payload:', JSON.stringify(uiPayload, null, 2));

    const createRes = await makeRequest(`${BASE_URL}/dashboard/proxy/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uiPayload)
    });

    if (createRes.status !== 201) {
      console.error('❌ UI simulation failed:', createRes.status, createRes.data);
      return;
    }

    const createdItem = createRes.data?.data || createRes.data;
    console.log('✅ UI simulation successful!');
    console.log('📦 Created item:', JSON.stringify(createdItem, null, 2));

    // 3. Verify the item appears in the dashboard list
    console.log('\n3. Verifying item appears in dashboard...');
    const listRes = await makeRequest(`${BASE_URL}/dashboard/proxy/items?restaurantId=${RESTAURANT_ID}&menu=main&limit=5`);
    const items = listRes.data?.data || [];
    const ourItem = items.find(item => item.id === createdItem.id);
    
    if (ourItem && ourItem.section_id === testSection.id) {
      console.log('✅ Item correctly linked to section in dashboard!');
    } else {
      console.log('❌ Item not found or not linked correctly');
    }

    // 4. Verify the item appears in public menu
    console.log('\n4. Verifying item appears in public menu...');
    const publicRes = await makeRequest(`${BASE_URL}/api/public/menu?restaurantId=${RESTAURANT_ID}&menu=main`);
    const publicItems = publicRes.data?.data || [];
    const publicItem = publicItems.find(item => item.id === createdItem.id);
    
    if (publicItem && publicItem.section_id === testSection.id) {
      console.log('✅ Item correctly linked to section in public menu!');
    } else {
      console.log('❌ Item not found in public menu or not linked correctly');
    }

    console.log('\n🎉 UI Integration Test Complete!');
    console.log('📊 Summary:');
    console.log(`   - Item created: ${createdItem.name} (${createdItem.id})`);
    console.log(`   - Section: ${testSection.name} (${testSection.id})`);
    console.log(`   - Dashboard link: ${ourItem?.section_id === testSection.id ? '✅' : '❌'}`);
    console.log(`   - Public menu link: ${publicItem?.section_id === testSection.id ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUIIntegration();
