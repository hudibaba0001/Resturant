// Test with existing section
const BASE_URL = "https://resturant-two-xi.vercel.app";
const RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0";
const MENU = "main";

async function testExistingSection() {
  console.log("🧪 Testing with existing section...");
  
  try {
    // 1. Get existing sections
    console.log("1. Getting existing sections...");
    const sectionsRes = await fetch(`${BASE_URL}/dashboard/proxy/menus/sections?restaurant_id=${RESTAURANT_ID}&menu=${MENU}`);
    const sectionsData = await sectionsRes.json();
    console.log("Sections response:", sectionsRes.status, sectionsData);
    
    if (!sectionsData.sections || sectionsData.sections.length === 0) {
      console.log("❌ No sections found");
      return;
    }
    
    const section = sectionsData.sections[0];
    console.log("Using section:", section.name, "ID:", section.id);
    
    // 2. Create item with section_id
    console.log("\n2. Creating item with section_id...");
    const itemPayload = {
      restaurantId: RESTAURANT_ID,
      menu: MENU,
      name: "Test Latte",
      price_cents: 5500,
      currency: "SEK",
      section_path: [section.name],
      section_id: section.id, // NEW: direct section reference
      description: "Test latte to verify section linking works",
      is_available: true
    };
    
    const itemRes = await fetch(`${BASE_URL}/dashboard/proxy/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    });
    
    const itemData = await itemRes.json();
    console.log("Item creation response:", itemRes.status, itemData);
    
    if (itemRes.ok) {
      console.log("✅ Item created successfully!");
      console.log("Item data:", {
        id: itemData.data?.id,
        name: itemData.data?.name,
        section_path: itemData.data?.section_path,
        section_id: itemData.data?.section_id
      });
      
      // 3. Verify item appears in public menu
      console.log("\n3. Checking public menu...");
      const menuRes = await fetch(`${BASE_URL}/api/public/menu?restaurantId=${RESTAURANT_ID}&menu=${MENU}`);
      const menuData = await menuRes.json();
      console.log("Public menu response:", menuRes.status);
      
      if (menuData.data && menuData.data.length > 0) {
        const testItem = menuData.data.find(item => item.name === "Test Latte");
        if (testItem) {
          console.log("✅ Test item found in public menu!");
          console.log("Item details:", {
            name: testItem.name,
            section_path: testItem.section_path,
            section_id: testItem.section_id,
            price_cents: testItem.price_cents
          });
        } else {
          console.log("❌ Test item not found in public menu");
        }
      }
      
    } else {
      console.log("❌ Item creation failed:", itemData);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testExistingSection();
