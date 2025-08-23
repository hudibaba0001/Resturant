require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test menu items with diverse cuisines and dietary restrictions
const testMenuItems = [
  // SWEDISH CUISINE
  {
    name: "Köttbullar med Potatismos",
    description: "Traditional Swedish meatballs with creamy mashed potatoes, lingonberry sauce, and pickled cucumber. Contains beef, pork, breadcrumbs, milk, egg, potato, lingonberry. Allergens: gluten, dairy, egg",
    price: 189.00,
    category: "Mains",
    allergens: ["gluten", "dairy", "egg"],
    is_available: true
  },
  {
    name: "Gravlax med Senapssås",
    description: "Cured salmon with mustard sauce, dill potatoes, and crispbread. Contains salmon, dill, salt, sugar, mustard, potato. Allergens: fish, mustard",
    price: 245.00,
    category: "Mains",
    allergens: ["fish", "mustard"],
    is_available: true
  },
  {
    name: "Ärtsoppa med Fläsk",
    description: "Yellow pea soup with pork, served with mustard and bread. Contains yellow peas, pork, onion, carrot, bread. Allergens: gluten",
    price: 165.00,
    category: "Mains",
    allergens: ["gluten"],
    is_available: true
  },

  // INDIAN CUISINE
  {
    name: "Butter Chicken",
    description: "Tender chicken in rich tomato and cream sauce with basmati rice and naan bread. Contains chicken, tomato, cream, butter, spices, rice, naan. Allergens: dairy, gluten",
    price: 195.00,
    category: "Mains",
    allergens: ["dairy", "gluten"],
    is_available: true
  },
  {
    name: "Palak Paneer",
    description: "Fresh spinach curry with homemade cheese, served with rice and roti. Contains spinach, paneer, onion, garlic, spices, rice, roti. Allergens: dairy, gluten",
    price: 175.00,
    category: "Mains",
    allergens: ["dairy", "gluten"],
    is_available: true
  },
  {
    name: "Chana Masala",
    description: "Spiced chickpeas in aromatic tomato sauce with rice and chapati. Contains chickpeas, tomato, onion, spices, rice, chapati. Allergens: gluten",
    price: 145.00,
    category: "Mains",
    allergens: ["gluten"],
    is_available: true
  },
  {
    name: "Lamb Biryani",
    description: "Fragrant basmati rice with tender lamb, aromatic spices, and raita. Contains lamb, basmati rice, spices, yogurt, mint, saffron. Allergens: dairy",
    price: 225.00,
    category: "Mains",
    allergens: ["dairy"],
    is_available: true
  },

  // ITALIAN CUISINE
  {
    name: "Margherita Pizza",
    description: "Classic pizza with tomato sauce, mozzarella, fresh basil, and olive oil. Contains pizza dough, tomato sauce, mozzarella, basil, olive oil. Allergens: gluten, dairy",
    price: 165.00,
    category: "Mains",
    allergens: ["gluten", "dairy"],
    is_available: true
  },
  {
    name: "Spaghetti Carbonara",
    description: "Al dente spaghetti with eggs, pecorino cheese, pancetta, and black pepper. Contains spaghetti, egg, pecorino, pancetta, black pepper. Allergens: gluten, dairy, egg",
    price: 185.00,
    category: "Mains",
    allergens: ["gluten", "dairy", "egg"],
    is_available: true
  },
  {
    name: "Risotto ai Funghi",
    description: "Creamy mushroom risotto with parmesan cheese and truffle oil. Contains arborio rice, mushrooms, parmesan, white wine, truffle oil. Allergens: dairy",
    price: 195.00,
    category: "Mains",
    allergens: ["dairy"],
    is_available: true
  },
  {
    name: "Osso Buco",
    description: "Braised veal shanks with gremolata, served with saffron risotto. Contains veal, white wine, vegetables, gremolata, saffron rice. Allergens: dairy",
    price: 285.00,
    category: "Mains",
    allergens: ["dairy"],
    is_available: true
  },

  // MEXICAN CUISINE
  {
    name: "Tacos de Carne Asada",
    description: "Grilled beef tacos with fresh salsa, guacamole, and lime crema. Contains beef, corn tortillas, salsa, avocado, lime, cream. Allergens: dairy, gluten",
    price: 175.00,
    category: "Mains",
    allergens: ["dairy", "gluten"],
    is_available: true
  },
  {
    name: "Enchiladas Verdes",
    description: "Chicken enchiladas with green tomatillo sauce and queso fresco. Contains chicken, tomatillos, tortillas, queso fresco, sour cream. Allergens: dairy, gluten",
    price: 185.00,
    category: "Mains",
    allergens: ["dairy", "gluten"],
    is_available: true
  },
  {
    name: "Pescado Veracruzano",
    description: "Fresh fish in tomato sauce with olives, capers, and herbs. Contains white fish, tomato, olives, capers, herbs, rice. Allergens: fish",
    price: 195.00,
    category: "Mains",
    allergens: ["fish"],
    is_available: true
  },

  // CHINESE CUISINE
  {
    name: "Kung Pao Chicken",
    description: "Spicy diced chicken with peanuts, vegetables, and chili sauce. Contains chicken, peanuts, vegetables, chili, soy sauce, rice. Allergens: peanuts, soy, gluten",
    price: 185.00,
    category: "Mains",
    allergens: ["peanuts", "soy", "gluten"],
    is_available: true
  },
  {
    name: "Mapo Tofu",
    description: "Spicy tofu with minced pork in chili bean sauce. Contains tofu, pork, chili bean sauce, vegetables, rice. Allergens: soy, gluten",
    price: 165.00,
    category: "Mains",
    allergens: ["soy", "gluten"],
    is_available: true
  },
  {
    name: "Peking Duck",
    description: "Crispy duck with pancakes, hoisin sauce, and spring onions. Contains duck, pancakes, hoisin sauce, spring onions, cucumber. Allergens: gluten",
    price: 295.00,
    category: "Mains",
    allergens: ["gluten"],
    is_available: true
  },
  {
    name: "Dim Sum Platter",
    description: "Assorted steamed dumplings with dipping sauces. Contains shrimp, pork, vegetables, wheat flour, soy sauce. Allergens: gluten, shrimp",
    price: 145.00,
    category: "Appetizers",
    allergens: ["gluten", "shrimp"],
    is_available: true
  },

  // VEGAN OPTIONS
  {
    name: "Buddha Bowl",
    description: "Quinoa bowl with roasted vegetables, avocado, and tahini dressing. Contains quinoa, sweet potato, kale, avocado, tahini, seeds. Allergens: sesame",
    price: 155.00,
    category: "Mains",
    allergens: ["sesame"],
    is_available: true
  },
  {
    name: "Vegan Pad Thai",
    description: "Rice noodles with tofu, vegetables, and tamarind sauce. Contains rice noodles, tofu, vegetables, tamarind, peanuts. Allergens: peanuts, soy",
    price: 165.00,
    category: "Mains",
    allergens: ["peanuts", "soy"],
    is_available: true
  },
  {
    name: "Mushroom Wellington",
    description: "Puff pastry filled with wild mushrooms, spinach, and herbs. Contains puff pastry, wild mushrooms, spinach, herbs, garlic. Allergens: gluten",
    price: 175.00,
    category: "Mains",
    allergens: ["gluten"],
    is_available: true
  },

  // GLUTEN-FREE OPTIONS
  {
    name: "Grilled Salmon",
    description: "Fresh salmon with roasted vegetables and lemon herb sauce. Contains salmon, vegetables, lemon, herbs, olive oil. Allergens: fish",
    price: 225.00,
    category: "Mains",
    allergens: ["fish"],
    is_available: true
  },
  {
    name: "Beef Stir Fry",
    description: "Tender beef with vegetables in gluten-free soy sauce. Contains beef, vegetables, gluten-free soy sauce, ginger, garlic. Allergens: soy",
    price: 195.00,
    category: "Mains",
    allergens: ["soy"],
    is_available: true
  },

  // APPETIZERS
  {
    name: "Bruschetta",
    description: "Toasted bread with fresh tomatoes, basil, and garlic. Contains bread, tomato, basil, garlic, olive oil. Allergens: gluten",
    price: 85.00,
    category: "Appetizers",
    allergens: ["gluten"],
    is_available: true
  },
  {
    name: "Spring Rolls",
    description: "Fresh vegetables wrapped in rice paper with peanut sauce. Contains rice paper, vegetables, herbs, peanut sauce. Allergens: peanuts",
    price: 95.00,
    category: "Appetizers",
    allergens: ["peanuts"],
    is_available: true
  },
  {
    name: "Hummus Plate",
    description: "Creamy hummus with pita bread and olive oil. Contains chickpeas, tahini, lemon, garlic, pita bread. Allergens: sesame, gluten",
    price: 75.00,
    category: "Appetizers",
    allergens: ["sesame", "gluten"],
    is_available: true
  },

  // DESSERTS
  {
    name: "Tiramisu",
    description: "Classic Italian dessert with coffee-soaked ladyfingers and mascarpone. Contains ladyfingers, mascarpone, coffee, cocoa, egg. Allergens: dairy, egg, gluten",
    price: 95.00,
    category: "Desserts",
    allergens: ["dairy", "egg", "gluten"],
    is_available: true
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with molten center and vanilla ice cream. Contains chocolate, butter, egg, flour, vanilla ice cream. Allergens: dairy, egg, gluten",
    price: 105.00,
    category: "Desserts",
    allergens: ["dairy", "egg", "gluten"],
    is_available: true
  },
  {
    name: "Vegan Chocolate Mousse",
    description: "Silky chocolate mousse made with aquafaba and dark chocolate. Contains dark chocolate, aquafaba, coconut cream, vanilla. Allergens: none",
    price: 85.00,
    category: "Desserts",
    allergens: [],
    is_available: true
  },

  // DRINKS
  {
    name: "Fresh Fruit Smoothie",
    description: "Blend of seasonal fruits with yogurt and honey. Contains mixed fruits, yogurt, honey, ice. Allergens: dairy",
    price: 65.00,
    category: "Drinks",
    allergens: ["dairy"],
    is_available: true
  },
  {
    name: "Green Tea Latte",
    description: "Matcha green tea with steamed milk and honey. Contains matcha, milk, honey. Allergens: dairy",
    price: 75.00,
    category: "Drinks",
    allergens: ["dairy"],
    is_available: true
  },
  {
    name: "Fresh Lemonade",
    description: "Homemade lemonade with mint and honey. Contains lemon, honey, mint, water. Allergens: none",
    price: 55.00,
    category: "Drinks",
    allergens: [],
    is_available: true
  }
];

async function seedTestMenu() {
  try {
    console.log('🌱 Seeding comprehensive test menu...');
    
    // Get the restaurant ID from command line or use default
    const restaurantId = process.argv[2] || '64806e5b-714f-4388-a092-29feff9b64c0';
    
    console.log(`📋 Adding ${testMenuItems.length} menu items to restaurant: ${restaurantId}`);
    
    // Insert all menu items
    const { data, error } = await supabase
      .from('menu_items')
      .insert(testMenuItems.map(item => ({
        ...item,
        restaurant_id: restaurantId,
        allergens: item.allergens || [],
        nutritional_info: {}
      })));
    
    if (error) {
      console.error('❌ Error seeding menu:', error);
      return;
    }
    
    console.log('✅ Successfully seeded test menu!');
    console.log(`📊 Added ${testMenuItems.length} items with diverse cuisines and dietary restrictions`);
    
    // Show summary by category
    const categories = {};
    const allergens = new Set();
    
    testMenuItems.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
      item.allergens.forEach(allergen => allergens.add(allergen));
    });
    
    console.log('\n📈 Menu Summary:');
    console.log('Categories:', categories);
    console.log('Allergens covered:', Array.from(allergens).sort());
    
    console.log('\n🎯 Testing Features:');
    console.log('• Multiple cuisines (Swedish, Indian, Italian, Mexican, Chinese, etc.)');
    console.log('• Dietary restrictions (Vegan, Gluten-free, Vegetarian)');
    console.log('• Various allergens (gluten, dairy, egg, fish, peanuts, soy, sesame)');
    console.log('• Different price ranges and categories');
    console.log('• Rich ingredient lists embedded in descriptions for AI chat testing');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the seeding
seedTestMenu();
