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

async function testPublicAPI() {
  console.log('🔍 Testing public API with section_id...\n');

  try {
    const publicRes = await makeRequest(`${BASE_URL}/api/public/menu?restaurantId=${RESTAURANT_ID}&menu=main`);
    
    console.log('Status:', publicRes.status);
    console.log('Raw data:', JSON.stringify(publicRes.data, null, 2));
    
    if (publicRes.data && publicRes.data.data) {
      const items = publicRes.data.data;
      console.log(`\nFound ${items.length} items in public API:`);
      items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} (ID: ${item.id})`);
        console.log(`   section_id: ${item.section_id}`);
        console.log(`   section_path: ${JSON.stringify(item.section_path)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPublicAPI();
