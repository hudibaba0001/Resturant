// Debug API to see what's happening with section_id
const BASE_URL = "https://resturant-two-xi.vercel.app";
const RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0";

async function debugAPI() {
  console.log("🔍 Debugging API section_id handling...");
  
  try {
    // Test with explicit section_id
    console.log("1. Testing API with section_id...");
    const itemPayload = {
      restaurantId: RESTAURANT_ID,
      menu: "main",
      name: "Debug Test Item",
      price_cents: 2000,
      currency: "SEK",
      section_path: ["Test Drinks"],
      section_id: "fb32d946-a551-4754-8fed-f59767357d68", // Explicit section_id
      description: "Debug test to see section_id handling",
      is_available: true
    };
    
    console.log("Sending payload:", JSON.stringify(itemPayload, null, 2));
    
    const itemRes = await fetch(`${BASE_URL}/dashboard/proxy/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    });
    
    const itemData = await itemRes.json();
    console.log("API Response Status:", itemRes.status);
    console.log("API Response Body:", JSON.stringify(itemData, null, 2));
    
    if (itemRes.ok) {
      console.log("\n2. Checking if section_id was stored in database...");
      
      // Get the item back to see what was actually stored
      const getRes = await fetch(`${BASE_URL}/dashboard/proxy/items?restaurantId=${RESTAURANT_ID}&menu=main`);
      const getData = await getRes.json();
      
      const testItem = getData.data?.find(item => item.name === "Debug Test Item");
      if (testItem) {
        console.log("Retrieved item from database:");
        console.log(JSON.stringify(testItem, null, 2));
        
        if (testItem.section_id) {
          console.log("✅ section_id was stored successfully!");
        } else {
          console.log("❌ section_id was NOT stored in database");
        }
      }
    } else {
      console.log("❌ API call failed:", itemData);
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

debugAPI();
