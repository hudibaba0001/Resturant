const BASE_URL = 'https://resturant-two-xi.vercel.app';

async function getMenuItems() {
  try {
    const response = await fetch(`${BASE_URL}/api/public/menu?restaurantId=64806e5b-714f-4388-a092-29feff9b64c0`);
    const menu = await response.json();
    
    console.log('📋 Available Menu Items:');
    console.log('========================');
    
    if (menu.sections) {
      menu.sections.forEach((section, sectionIndex) => {
        console.log(`\n${section.name || `Section ${sectionIndex + 1}`}:`);
        if (section.items) {
          section.items.forEach((item, itemIndex) => {
            console.log(`  ${itemIndex + 1}. ${item.name} (ID: ${item.id}) - $${(item.price_cents / 100).toFixed(2)}`);
          });
        }
      });
    }
    
    // Return first item ID for testing
    const firstItem = menu.sections?.[0]?.items?.[0];
    if (firstItem) {
      console.log(`\n🎯 Use this ID for testing: ${firstItem.id}`);
      return firstItem.id;
    }
  } catch (error) {
    console.error('Error fetching menu:', error.message);
  }
}

getMenuItems();
