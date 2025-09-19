// Test current state before migration
const BASE_URL = "https://resturant-two-xi.vercel.app";
const RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0";

async function testCurrentState() {
  console.log("🔍 Testing current state...");
  
  try {
    // Test sections API
    console.log("1. Testing sections API...");
    const sectionsRes = await fetch(`${BASE_URL}/dashboard/proxy/menus/sections?restaurant_id=${RESTAURANT_ID}&menu=main`);
    const sectionsText = await sectionsRes.text();
    console.log("Sections response status:", sectionsRes.status);
    console.log("Sections response body:", sectionsText);
    
    // Test items API
    console.log("\n2. Testing items API...");
    const itemsRes = await fetch(`${BASE_URL}/dashboard/proxy/items?restaurantId=${RESTAURANT_ID}&menu=main`);
    const itemsText = await itemsRes.text();
    console.log("Items response status:", itemsRes.status);
    console.log("Items response body:", itemsText);
    
    // Test public menu API
    console.log("\n3. Testing public menu API...");
    const menuRes = await fetch(`${BASE_URL}/api/public/menu?restaurantId=${RESTAURANT_ID}&menu=main`);
    const menuText = await menuRes.text();
    console.log("Public menu response status:", menuRes.status);
    console.log("Public menu response body:", menuText);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testCurrentState();
