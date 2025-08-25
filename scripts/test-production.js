const BASE_URL = 'https://resturant-two-xi.vercel.app';

async function testEndpoint(endpoint) {
  console.log(`Testing: ${BASE_URL}${endpoint}`);
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`Response (first 200 chars):`, text.substring(0, 200));
    console.log('---');
  } catch (error) {
    console.log(`Error:`, error.message);
    console.log('---');
  }
}

async function main() {
  console.log('Testing production endpoints...\n');
  
  await testEndpoint('/api/health');
  await testEndpoint('/api/public/menu?restaurantId=test');
  await testEndpoint('/');
}

main();
