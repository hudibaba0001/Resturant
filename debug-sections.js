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

async function debugSections() {
  console.log('🔍 Debugging sections API...\n');

  try {
    const sectionsRes = await makeRequest(`${BASE_URL}/dashboard/proxy/menus/sections?restaurant_id=${RESTAURANT_ID}&menu=main`);
    
    console.log('Status:', sectionsRes.status);
    console.log('Headers:', sectionsRes.headers);
    console.log('Raw data:', sectionsRes.data);
    console.log('Type of data:', typeof sectionsRes.data);
    
    if (sectionsRes.data && typeof sectionsRes.data === 'object') {
      console.log('Keys:', Object.keys(sectionsRes.data));
      if (sectionsRes.data.data) {
        console.log('Data array length:', sectionsRes.data.data.length);
        console.log('First item:', sectionsRes.data.data[0]);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugSections();
