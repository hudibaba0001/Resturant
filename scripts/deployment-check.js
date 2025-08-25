const BASE_URL = 'https://resturant-git-feat-data-spine-lovedeep-singhs-projects-96b003a8.vercel.app';

async function checkDeployment() {
  console.log('🔍 Checking deployment status...\n');
  
  try {
    // Test basic connectivity
    console.log('1. Testing basic connectivity...');
    const response = await fetch(BASE_URL);
    console.log(`✅ Site responds: ${response.status} ${response.statusText}`);
    
    // Test health endpoint
    console.log('\n2. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    console.log(`Health status: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health endpoint working');
      console.log(`   Status: ${health.status}`);
      console.log(`   Environment: ${health.environment}`);
      console.log(`   Response time: ${health.responseTime}`);
    } else {
      console.log('❌ Health endpoint failed');
      const errorText = await healthResponse.text();
      console.log(`   Error: ${errorText.substring(0, 200)}...`);
    }
    
    // Test menu endpoint
    console.log('\n3. Testing menu endpoint...');
    const menuResponse = await fetch(`${BASE_URL}/api/public/menu?restaurantId=64806e5b-714f-4388-a092-29feff9b64c0`);
    console.log(`Menu status: ${menuResponse.status} ${menuResponse.statusText}`);
    
    if (menuResponse.ok) {
      const menu = await menuResponse.json();
      console.log('✅ Menu endpoint working');
      console.log(`   Sections: ${menu.sections?.length || 0}`);
    } else {
      console.log('❌ Menu endpoint failed');
    }
    
    console.log('\n📋 Deployment Status Summary:');
    console.log(`   Site: ${response.ok ? '✅ Online' : '❌ Offline'}`);
    console.log(`   Health: ${healthResponse.ok ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Menu: ${menuResponse.ok ? '✅ Working' : '❌ Failed'}`);
    
  } catch (error) {
    console.error('❌ Deployment check failed:', error.message);
  }
}

checkDeployment();
