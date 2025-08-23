-- Comprehensive Test Menu Seeding Script
-- Run this in Supabase SQL Editor to add diverse menu items for testing

-- Replace with your actual restaurant ID
DO $$
DECLARE
    restaurant_id UUID := '64806e5b-714f-4388-a092-29feff9b64c0';
BEGIN

-- Clear existing menu items (optional - comment out if you want to keep existing items)
-- DELETE FROM menu_items WHERE restaurant_id = restaurant_id;

-- Insert comprehensive test menu items
INSERT INTO menu_items (
    restaurant_id, name, description, price, category, allergens, is_available
) VALUES
-- SWEDISH CUISINE
(restaurant_id, 'Köttbullar med Potatismos', 'Traditional Swedish meatballs with creamy mashed potatoes, lingonberry sauce, and pickled cucumber. Contains beef, pork, breadcrumbs, milk, egg, potato, lingonberry. Allergens: gluten, dairy, egg', 189.00, 'Mains', ARRAY['gluten', 'dairy', 'egg'], true),
(restaurant_id, 'Gravlax med Senapssås', 'Cured salmon with mustard sauce, dill potatoes, and crispbread. Contains salmon, dill, salt, sugar, mustard, potato. Allergens: fish, mustard', 245.00, 'Mains', ARRAY['fish', 'mustard'], true),
(restaurant_id, 'Ärtsoppa med Fläsk', 'Yellow pea soup with pork, served with mustard and bread. Contains yellow peas, pork, onion, carrot, bread. Allergens: gluten', 165.00, 'Mains', ARRAY['gluten'], true),

-- INDIAN CUISINE
(restaurant_id, 'Butter Chicken', 'Tender chicken in rich tomato and cream sauce with basmati rice and naan bread. Contains chicken, tomato, cream, butter, spices, rice, naan. Allergens: dairy, gluten', 195.00, 'Mains', ARRAY['dairy', 'gluten'], true),
(restaurant_id, 'Palak Paneer', 'Fresh spinach curry with homemade cheese, served with rice and roti. Contains spinach, paneer, onion, garlic, spices, rice, roti. Allergens: dairy, gluten', 175.00, 'Mains', ARRAY['dairy', 'gluten'], true),
(restaurant_id, 'Chana Masala', 'Spiced chickpeas in aromatic tomato sauce with rice and chapati. Contains chickpeas, tomato, onion, spices, rice, chapati. Allergens: gluten', 145.00, 'Mains', ARRAY['gluten'], true),
(restaurant_id, 'Lamb Biryani', 'Fragrant basmati rice with tender lamb, aromatic spices, and raita. Contains lamb, basmati rice, spices, yogurt, mint, saffron. Allergens: dairy', 225.00, 'Mains', ARRAY['dairy'], true),

-- ITALIAN CUISINE
(restaurant_id, 'Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella, fresh basil, and olive oil. Contains pizza dough, tomato sauce, mozzarella, basil, olive oil. Allergens: gluten, dairy', 165.00, 'Mains', ARRAY['gluten', 'dairy'], true),
(restaurant_id, 'Spaghetti Carbonara', 'Al dente spaghetti with eggs, pecorino cheese, pancetta, and black pepper. Contains spaghetti, egg, pecorino, pancetta, black pepper. Allergens: gluten, dairy, egg', 185.00, 'Mains', ARRAY['gluten', 'dairy', 'egg'], true),
(restaurant_id, 'Risotto ai Funghi', 'Creamy mushroom risotto with parmesan cheese and truffle oil. Contains arborio rice, mushrooms, parmesan, white wine, truffle oil. Allergens: dairy', 195.00, 'Mains', ARRAY['dairy'], true),
(restaurant_id, 'Osso Buco', 'Braised veal shanks with gremolata, served with saffron risotto. Contains veal, white wine, vegetables, gremolata, saffron rice. Allergens: dairy', 285.00, 'Mains', ARRAY['dairy'], true),

-- MEXICAN CUISINE
(restaurant_id, 'Tacos de Carne Asada', 'Grilled beef tacos with fresh salsa, guacamole, and lime crema. Contains beef, corn tortillas, salsa, avocado, lime, cream. Allergens: dairy, gluten', 175.00, 'Mains', ARRAY['dairy', 'gluten'], true),
(restaurant_id, 'Enchiladas Verdes', 'Chicken enchiladas with green tomatillo sauce and queso fresco. Contains chicken, tomatillos, tortillas, queso fresco, sour cream. Allergens: dairy, gluten', 185.00, 'Mains', ARRAY['dairy', 'gluten'], true),
(restaurant_id, 'Pescado Veracruzano', 'Fresh fish in tomato sauce with olives, capers, and herbs. Contains white fish, tomato, olives, capers, herbs, rice. Allergens: fish', 195.00, 'Mains', ARRAY['fish'], true),

-- CHINESE CUISINE
(restaurant_id, 'Kung Pao Chicken', 'Spicy diced chicken with peanuts, vegetables, and chili sauce. Contains chicken, peanuts, vegetables, chili, soy sauce, rice. Allergens: peanuts, soy, gluten', 185.00, 'Mains', ARRAY['peanuts', 'soy', 'gluten'], true),
(restaurant_id, 'Mapo Tofu', 'Spicy tofu with minced pork in chili bean sauce. Contains tofu, pork, chili bean sauce, vegetables, rice. Allergens: soy, gluten', 165.00, 'Mains', ARRAY['soy', 'gluten'], true),
(restaurant_id, 'Peking Duck', 'Crispy duck with pancakes, hoisin sauce, and spring onions. Contains duck, pancakes, hoisin sauce, spring onions, cucumber. Allergens: gluten', 295.00, 'Mains', ARRAY['gluten'], true),
(restaurant_id, 'Dim Sum Platter', 'Assorted steamed dumplings with dipping sauces. Contains shrimp, pork, vegetables, wheat flour, soy sauce. Allergens: gluten, shrimp', 145.00, 'Appetizers', ARRAY['gluten', 'shrimp'], true),

-- VEGAN OPTIONS
(restaurant_id, 'Buddha Bowl', 'Quinoa bowl with roasted vegetables, avocado, and tahini dressing. Contains quinoa, sweet potato, kale, avocado, tahini, seeds. Allergens: sesame', 155.00, 'Mains', ARRAY['sesame'], true),
(restaurant_id, 'Vegan Pad Thai', 'Rice noodles with tofu, vegetables, and tamarind sauce. Contains rice noodles, tofu, vegetables, tamarind, peanuts. Allergens: peanuts, soy', 165.00, 'Mains', ARRAY['peanuts', 'soy'], true),
(restaurant_id, 'Mushroom Wellington', 'Puff pastry filled with wild mushrooms, spinach, and herbs. Contains puff pastry, wild mushrooms, spinach, herbs, garlic. Allergens: gluten', 175.00, 'Mains', ARRAY['gluten'], true),

-- GLUTEN-FREE OPTIONS
(restaurant_id, 'Grilled Salmon', 'Fresh salmon with roasted vegetables and lemon herb sauce. Contains salmon, vegetables, lemon, herbs, olive oil. Allergens: fish', 225.00, 'Mains', ARRAY['fish'], true),
(restaurant_id, 'Beef Stir Fry', 'Tender beef with vegetables in gluten-free soy sauce. Contains beef, vegetables, gluten-free soy sauce, ginger, garlic. Allergens: soy', 195.00, 'Mains', ARRAY['soy'], true),

-- APPETIZERS
(restaurant_id, 'Bruschetta', 'Toasted bread with fresh tomatoes, basil, and garlic. Contains bread, tomato, basil, garlic, olive oil. Allergens: gluten', 85.00, 'Appetizers', ARRAY['gluten'], true),
(restaurant_id, 'Spring Rolls', 'Fresh vegetables wrapped in rice paper with peanut sauce. Contains rice paper, vegetables, herbs, peanut sauce. Allergens: peanuts', 95.00, 'Appetizers', ARRAY['peanuts'], true),
(restaurant_id, 'Hummus Plate', 'Creamy hummus with pita bread and olive oil. Contains chickpeas, tahini, lemon, garlic, pita bread. Allergens: sesame, gluten', 75.00, 'Appetizers', ARRAY['sesame', 'gluten'], true),

-- DESSERTS
(restaurant_id, 'Tiramisu', 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone. Contains ladyfingers, mascarpone, coffee, cocoa, egg. Allergens: dairy, egg, gluten', 95.00, 'Desserts', ARRAY['dairy', 'egg', 'gluten'], true),
(restaurant_id, 'Chocolate Lava Cake', 'Warm chocolate cake with molten center and vanilla ice cream. Contains chocolate, butter, egg, flour, vanilla ice cream. Allergens: dairy, egg, gluten', 105.00, 'Desserts', ARRAY['dairy', 'egg', 'gluten'], true),
(restaurant_id, 'Vegan Chocolate Mousse', 'Silky chocolate mousse made with aquafaba and dark chocolate. Contains dark chocolate, aquafaba, coconut cream, vanilla. Allergens: none', 85.00, 'Desserts', ARRAY[]::text[], true),

-- DRINKS
(restaurant_id, 'Fresh Fruit Smoothie', 'Blend of seasonal fruits with yogurt and honey. Contains mixed fruits, yogurt, honey, ice. Allergens: dairy', 65.00, 'Drinks', ARRAY['dairy'], true),
(restaurant_id, 'Green Tea Latte', 'Matcha green tea with steamed milk and honey. Contains matcha, milk, honey. Allergens: dairy', 75.00, 'Drinks', ARRAY['dairy'], true),
(restaurant_id, 'Fresh Lemonade', 'Homemade lemonade with mint and honey. Contains lemon, honey, mint, water. Allergens: none', 55.00, 'Drinks', ARRAY[]::text[], true);

-- Show summary
RAISE NOTICE '✅ Successfully seeded comprehensive test menu!';
RAISE NOTICE '📊 Added 32 items with diverse cuisines and dietary restrictions';

END $$;

-- Query to verify the menu items were added
SELECT 
    category,
    COUNT(*) as item_count
FROM menu_items 
WHERE restaurant_id = '64806e5b-714f-4388-a092-29feff9b64c0'
GROUP BY category
ORDER BY category;

-- Query to see all allergens covered
SELECT DISTINCT unnest(allergens) as allergen
FROM menu_items 
WHERE restaurant_id = '64806e5b-714f-4388-a092-29feff9b64c0'
ORDER BY allergen;
