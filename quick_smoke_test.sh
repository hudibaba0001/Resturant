#!/bin/bash

# 🚀 Quick Production Smoke Test
# Run this after deployment to verify everything works

# UPDATE THESE VALUES with your actual production details
BASE_URL="https://your-app.vercel.app"  # Replace with your Vercel URL
RESTAURANT_UUID="your-restaurant-uuid"   # Replace with actual UUID
MENU_ITEM_UUID="your-menu-item-uuid"     # Replace with actual UUID

echo "🚀 Quick Production Smoke Test"
echo "=============================="
echo "Testing: $BASE_URL"
echo ""

# 1. Health Check
echo "1️⃣ Health Check..."
curl -s "$BASE_URL/api/health" | jq .
echo ""

# 2. Security Headers
echo "2️⃣ Security Headers..."
curl -sI "$BASE_URL" | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options\|referrer-policy"
echo ""

# 3. Public APIs
echo "3️⃣ Public APIs..."
echo "Status:"
curl -s "$BASE_URL/api/public/status?restaurantId=$RESTAURANT_UUID" | jq .
echo ""
echo "Menu:"
curl -s "$BASE_URL/api/public/menu?restaurantId=$RESTAURANT_UUID" | jq '.sections | length'
echo ""

# 4. Chat API
echo "4️⃣ Chat API..."
curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RESTAURANT_UUID\",\"sessionToken\":\"smoke-test\",\"message\":\"vegan options?\"}" | jq .
echo ""

# 5. Orders API
echo "5️⃣ Orders API (Dine-in)..."
curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RESTAURANT_UUID\",\"sessionToken\":\"smoke-test\",\"type\":\"dine_in\",\"items\":[{\"itemId\":\"$MENU_ITEM_UUID\",\"qty\":1}]}" | jq .
echo ""

echo "6️⃣ Orders API (Pickup)..."
curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RESTAURANT_UUID\",\"sessionToken\":\"smoke-test\",\"type\":\"pickup\",\"items\":[{\"itemId\":\"$MENU_ITEM_UUID\",\"qty\":1}]}" | jq .
echo ""

echo "🎉 Quick smoke test complete!"
echo ""
echo "📋 Expected Results:"
echo "✅ Health: { \"ok\": true, \"timestamp\": \"...\", \"version\": \"1.0.0\" }"
echo "✅ Headers: 4 security headers present"
echo "✅ Status: { \"open\": true|false }"
echo "✅ Menu: Non-zero sections count"
echo "✅ Chat: { \"response\": \"...\", \"restaurant\": {...} }"
echo "✅ Dine-in: { \"orderCode\": \"ABC123\" }"
echo "✅ Pickup: { \"checkoutUrl\": \"https://checkout.stripe.com/...\" }"
