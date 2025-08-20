#!/bin/bash

# 🚀 Production Smoke Test Script - Dashboard v1
# Run this after deploying to Vercel Production

# Configuration - UPDATE THESE VALUES
BASE_URL="https://your-domain.vercel.app"  # Replace with your Vercel production URL
RESTAURANT_UUID="your-restaurant-uuid"      # Replace with actual restaurant UUID
MENU_ITEM_UUID="your-menu-item-uuid"        # Replace with actual menu item UUID

echo "🚀 Starting Production Smoke Tests for $BASE_URL"
echo "=================================================="

# 1) Health Check
echo "1️⃣ Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
echo "Health Response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Health check PASSED"
else
    echo "❌ Health check FAILED"
    exit 1
fi

# 2) Security Headers
echo ""
echo "2️⃣ Testing Security Headers..."
HEADERS=$(curl -sI "$BASE_URL" | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options\|referrer-policy")
echo "Security Headers:"
echo "$HEADERS"

HEADER_COUNT=$(echo "$HEADERS" | wc -l)
if [ "$HEADER_COUNT" -ge 4 ]; then
    echo "✅ Security headers PASSED ($HEADER_COUNT headers found)"
else
    echo "❌ Security headers FAILED (expected 4, found $HEADER_COUNT)"
fi

# 3) Public APIs
echo ""
echo "3️⃣ Testing Public APIs..."

# Status API
echo "Testing /api/public/status..."
STATUS_RESPONSE=$(curl -s "$BASE_URL/api/public/status?restaurantId=$RESTAURANT_UUID")
echo "Status Response: $STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | grep -q '"open"'; then
    echo "✅ Status API PASSED"
else
    echo "❌ Status API FAILED"
fi

# Menu API
echo "Testing /api/public/menu..."
MENU_RESPONSE=$(curl -s "$BASE_URL/api/public/menu?restaurantId=$RESTAURANT_UUID")
SECTIONS_COUNT=$(echo "$MENU_RESPONSE" | jq '.sections | length' 2>/dev/null || echo "0")
echo "Menu Response: $MENU_RESPONSE"
echo "Sections Count: $SECTIONS_COUNT"

if [ "$SECTIONS_COUNT" -gt 0 ]; then
    echo "✅ Menu API PASSED"
else
    echo "❌ Menu API FAILED"
fi

# 4) Chat API
echo ""
echo "4️⃣ Testing Chat API..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RESTAURANT_UUID\",\"sessionToken\":\"smoke-test\",\"message\":\"vegan options?\"}")
echo "Chat Response: $CHAT_RESPONSE"

if echo "$CHAT_RESPONSE" | grep -q '"response"'; then
    echo "✅ Chat API PASSED"
else
    echo "❌ Chat API FAILED"
fi

# 5) Orders API - Dine-in
echo ""
echo "5️⃣ Testing Orders API (Dine-in)..."
DINEIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RESTAURANT_UUID\",\"sessionToken\":\"smoke-test\",\"type\":\"dine_in\",\"items\":[{\"itemId\":\"$MENU_ITEM_UUID\",\"qty\":1}]}")
echo "Dine-in Response: $DINEIN_RESPONSE"

if echo "$DINEIN_RESPONSE" | grep -q '"orderCode"'; then
    echo "✅ Dine-in Orders API PASSED"
else
    echo "❌ Dine-in Orders API FAILED"
fi

# 6) Orders API - Pickup (Stripe)
echo ""
echo "6️⃣ Testing Orders API (Pickup/Stripe)..."
PICKUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RESTAURANT_UUID\",\"sessionToken\":\"smoke-test\",\"type\":\"pickup\",\"items\":[{\"itemId\":\"$MENU_ITEM_UUID\",\"qty\":1}]}")
echo "Pickup Response: $PICKUP_RESPONSE"

if echo "$PICKUP_RESPONSE" | grep -q '"checkoutUrl"'; then
    echo "✅ Pickup Orders API PASSED"
else
    echo "❌ Pickup Orders API FAILED"
fi

# 7) Error Handling Test
echo ""
echo "7️⃣ Testing Error Handling..."
ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"invalid\":\"payload\"}")
echo "Error Response: $ERROR_RESPONSE"

if echo "$ERROR_RESPONSE" | grep -q '"error"'; then
    echo "✅ Error Handling PASSED"
else
    echo "❌ Error Handling FAILED"
fi

# 8) CORS Test
echo ""
echo "8️⃣ Testing CORS Headers..."
CORS_RESPONSE=$(curl -s -H "Origin: https://test-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS "$BASE_URL/api/chat")
echo "CORS Response Status: $CORS_RESPONSE"

if [ -n "$CORS_RESPONSE" ]; then
    echo "✅ CORS Test PASSED"
else
    echo "❌ CORS Test FAILED"
fi

echo ""
echo "=================================================="
echo "🎉 Smoke Test Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Set up Stripe webhook: $BASE_URL/api/stripe/webhook"
echo "2. Configure STRIPE_WEBHOOK_SECRET in Vercel"
echo "3. Test widget embed on external site"
echo "4. Monitor Sentry for any errors"
echo "5. Run Lighthouse performance tests"
echo ""
echo "🚀 Ready for pilot restaurant onboarding!"
