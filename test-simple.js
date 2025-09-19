// Simple test to check if section_id is now being returned
const BASE_URL = "https://resturant-two-xi.vercel.app";
const RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0";

async function testSimple() {
  try {
    console.log("Testing if section_id is now returned...");
    
    const res = await fetch(`${BASE_URL}/dashboard/proxy/items?restaurantId=${RESTAURANT_ID}&menu=main`);
    const data = await res.json();
    
    console.log("Status:", res.status);
    console.log("Data count:", data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      const firstItem = data.data[0];
      console.log("First item:", {
        name: firstItem.name,
        section_path: firstItem.section_path,
        section_id: firstItem.section_id
      });
      
      if (firstItem.section_id) {
        console.log("✅ section_id is now being returned!");
      } else {
        console.log("❌ section_id is still not being returned");
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testSimple();
