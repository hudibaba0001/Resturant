// Test database directly to see if section_id is being stored
const BASE_URL = "https://resturant-two-xi.vercel.app";
const RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0";

async function testDirectDB() {
  console.log("🔍 Testing database directly...");
  
  try {
    // Create an item and then immediately query it
    console.log("1. Creating item...");
    const createPayload = {
      restaurantId: RESTAURANT_ID,
      menu: "main",
      name: "Direct DB Test",
      price_cents: 6000,
      currency: "SEK",
      section_path: ["Test Drinks"],
      section_id: "fb32d946-a551-4754-8fed-f59767357d68",
      description: "Testing direct database access",
      is_available: true
    };
    
    const createRes = await fetch(`${BASE_URL}/dashboard/proxy/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPayload)
    });
    
    const createData = await createRes.json();
    console.log("Create response:", createRes.status, createData);
    
    if (createRes.ok) {
      const itemId = createData.data?.id;
      console.log("Created item ID:", itemId);
      
      // Try to get the item by ID
      console.log("\n2. Getting item by ID...");
      const getRes = await fetch(`${BASE_URL}/dashboard/proxy/items/${itemId}`);
      const getData = await getRes.json();
      console.log("Get by ID response:", getRes.status, getData);
      
      // Try to get all items and find this one
      console.log("\n3. Getting all items...");
      const allRes = await fetch(`${BASE_URL}/dashboard/proxy/items?restaurantId=${RESTAURANT_ID}&menu=main`);
      const allData = await allRes.json();
      console.log("All items response:", allRes.status);
      
      const testItem = allData.data?.find(item => item.id === itemId);
      if (testItem) {
        console.log("Found item in list:", {
          id: testItem.id,
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

testDirectDB();
