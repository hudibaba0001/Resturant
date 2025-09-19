// Test database schema to see if section_id column exists
const BASE_URL = "https://resturant-two-xi.vercel.app";
const RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0";

async function testDatabaseSchema() {
  console.log("🔍 Testing database schema...");
  
  try {
    // Test creating an item and see what gets stored
    console.log("1. Creating item to test database...");
    const itemPayload = {
      restaurantId: RESTAURANT_ID,
      menu: "main",
      name: "Schema Test Item",
      price_cents: 1000,
      currency: "SEK",
      section_path: ["Test Drinks"],
      section_id: "fb32d946-a551-4754-8fed-f59767357d68", // Use existing section ID
      description: "Testing if section_id gets stored",
      is_available: true
    };
    
    const itemRes = await fetch(`${BASE_URL}/dashboard/proxy/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    });
    
    const itemData = await itemRes.json();
    console.log("Item creation response:", itemRes.status);
    console.log("Full response:", JSON.stringify(itemData, null, 2));
    
    if (itemRes.ok) {
      console.log("\n2. Checking if section_id was stored...");
      console.log("Response section_id:", itemData.data?.section_id);
      
      // Try to get the item back
      const getRes = await fetch(`${BASE_URL}/dashboard/proxy/items?restaurantId=${RESTAURANT_ID}&menu=main`);
      const getData = await getRes.json();
      console.log("Items list response:", getRes.status);
      
      const testItem = getData.data?.find(item => item.name === "Schema Test Item");
      if (testItem) {
        console.log("Found item in list:", {
          name: testItem.name,
          section_path: testItem.section_path,
          section_id: testItem.section_id
        });
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testDatabaseSchema();
