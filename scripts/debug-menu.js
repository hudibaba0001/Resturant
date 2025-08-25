const BASE_URL = 'https://resturant-two-xi.vercel.app';

async function debugMenu() {
  try {
    const response = await fetch(`${BASE_URL}/api/public/menu?restaurantId=64806e5b-714f-4388-a092-29feff9b64c0`);
    const menu = await response.json();
    
    console.log('🔍 Menu Debug Info:');
    console.log('==================');
    console.log('Full menu response:', JSON.stringify(menu, null, 2));
    
    if (menu.sections && menu.sections[0] && menu.sections[0].items && menu.sections[0].items[0]) {
      const firstItem = menu.sections[0].items[0];
      console.log('\n🎯 First item details:');
      console.log('ID type:', typeof firstItem.id);
      console.log('ID value:', firstItem.id);
      console.log('Full item:', JSON.stringify(firstItem, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugMenu();
