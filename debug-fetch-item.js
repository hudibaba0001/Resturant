const https = require('https');

const BASE_URL = 'https://resturant-two-xi.vercel.app';
const ITEM_ID = 'c01d4640-d4be-4a39-a3df-fc83cdb5fe77'; // The latest item with section_id

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

async function debugFetchItem() {
  console.log('🔍 Debugging fetch item by ID...\n');

  try {
    const fetchRes = await makeRequest(`${BASE_URL}/dashboard/proxy/items/${ITEM_ID}`);
    
    console.log('Status:', fetchRes.status);
    console.log('Headers:', fetchRes.headers);
    console.log('Raw data:', fetchRes.data);
    console.log('Type of data:', typeof fetchRes.data);
    
    if (fetchRes.data && typeof fetchRes.data === 'object') {
      console.log('Keys:', Object.keys(fetchRes.data));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFetchItem();
