// Test section linking after migration
const BASE_URL = "https://resturant-two-xi.vercel.app";
const RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0";
const MENU = "main";

async function testSectionLinkingFixed() {
  console.log("🧪 Testing section linking after migration...");
  
  try {
    // 1. Create a test section first
    console.log("1. Creating test section...");
    const createSectionRes = await fetch(`${BASE_URL}/dashboard/proxy/menus/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: RESTAURANT_ID,
        menu_slug: MENU,
        name: "Test Drinks"
      })
    });
    
    const sectionData = await createSectionRes.json();
    console.log("Section creation response:", createSectionRes.status, sectionData);
    
    if (!createSectionRes.ok) {
      console.log("❌ Section creation failed:", sectionData);
      return;
    }
    
    const sectionId = sectionData.section?.id || sectionData.data?.id || sectionData.id;
    console.log("✅ Section created with ID:", sectionId);
    
    // 2. Create item with section_id
    console.log("\n2. Creating item with section_id...");
    const itemPayload = {
      restaurantId: RESTAURANT_ID,
      menu: MENU,
      name: "Test Coffee",
      price_cents: 4500,
      currency: "SEK",
      section_path: ["Test Drinks"],
      section_id: sectionId, // NEW: direct section reference
      description: "Test item to verify section linking works",
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
      console.log("✅ Item created successfully with section_id!");
      
      // 3. Verify item appears in public menu
      console.log("\n3. Checking public menu...");
      const menuRes = await fetch(`${BASE_URL}/api/public/menu?restaurantId=${RESTAURANT_ID}&menu=${MENU}`);
      const menuData = await menuRes.json();
      console.log("Public menu response:", menuRes.status);
      
      if (menuData.data && menuData.data.length > 0) {
        const testItem = menuData.data.find(item => item.name === "Test Coffee");
        if (testItem) {
          console.log("✅ Test item found in public menu!");
          console.log("Item details:", {
            name: testItem.name,
            section_path: testItem.section_path,
            price_cents: testItem.price_cents,
            section_id: testItem.section_id
          });
        } else {
          console.log("❌ Test item not found in public menu");
        }
      } else {
        console.log("❌ No items in public menu");
      }
      
      // 4. Test listing items by section
      console.log("\n4. Testing items list...");
      const itemsRes = await fetch(`${BASE_URL}/dashboard/proxy/items?restaurantId=${RESTAURANT_ID}&menu=${MENU}&section=Test Drinks`);
      const itemsData = await itemsRes.json();
      console.log("Items list response:", itemsRes.status, itemsData);
      
      if (itemsData.data && itemsData.data.length > 0) {
        console.log("✅ Items listed successfully!");
        console.log("Found items:", itemsData.data.length);
      }
      
    } else {
      console.log("❌ Item creation failed:", itemData);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSectionLinkingFixed();
