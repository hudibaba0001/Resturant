// Test if foreign key constraint is blocking the insert
const BASE_URL = "https://resturant-two-xi.vercel.app";
const RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0";

async function testForeignKey() {
  console.log("🔍 Testing foreign key constraint...");
  
  try {
    // Test with a valid section_id first
    console.log("1. Testing with valid section_id...");
    const validPayload = {
      restaurantId: RESTAURANT_ID,
      menu: "main",
      name: "Valid Section Test",
      price_cents: 3000,
      currency: "SEK",
      section_path: ["Test Drinks"],
      section_id: "fb32d946-a551-4754-8fed-f59767357d68", // This should exist
      description: "Testing with valid section_id",
      is_available: true
    };
    
    const validRes = await fetch(`${BASE_URL}/dashboard/proxy/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload)
    });
    
    const validData = await validRes.json();
    console.log("Valid section_id test:", validRes.status, validData);
    
    // Test with null section_id
    console.log("\n2. Testing with null section_id...");
    const nullPayload = {
      restaurantId: RESTAURANT_ID,
      menu: "main",
      name: "Null Section Test",
      price_cents: 4000,
      currency: "SEK",
      section_path: ["Test Drinks"],
      section_id: null, // Explicitly null
      description: "Testing with null section_id",
      is_available: true
    };
    
    const nullRes = await fetch(`${BASE_URL}/dashboard/proxy/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nullPayload)
    });
    
    const nullData = await nullRes.json();
    console.log("Null section_id test:", nullRes.status, nullData);
    
    // Test without section_id field
    console.log("\n3. Testing without section_id field...");
    const noFieldPayload = {
      restaurantId: RESTAURANT_ID,
      menu: "main",
      name: "No Section Field Test",
      price_cents: 5000,
      currency: "SEK",
      section_path: ["Test Drinks"],
      // No section_id field at all
      description: "Testing without section_id field",
      is_available: true
    };
    
    const noFieldRes = await fetch(`${BASE_URL}/dashboard/proxy/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(noFieldPayload)
    });
    
    const noFieldData = await noFieldRes.json();
    console.log("No section_id field test:", noFieldRes.status, noFieldData);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testForeignKey();
