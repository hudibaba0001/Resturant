#!/bin/bash

# 🚀 Stjarna Deployment Script
# Run this after setting up Vercel environment variables

set -e  # Exit on any error

echo "🚀 Starting Stjarna deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"your-domain.vercel.app"}
RESTAURANT_ID=${2:-"64806e5b-714f-4388-a092-29feff9b64c0"}

echo -e "${YELLOW}Deploying to: https://$DOMAIN${NC}"
echo -e "${YELLOW}Test restaurant ID: $RESTAURANT_ID${NC}"

# Step 1: Deploy to Vercel
echo -e "\n${YELLOW}Step 1: Deploying to Vercel...${NC}"
vercel --prod --yes

# Wait for deployment with health check retry
echo -e "\n${YELLOW}Waiting for deployment to complete...${NC}"
for i in {1..18}; do
  echo -n "."
  sleep 5
  HEALTH_RESPONSE=$(curl -s "https://$DOMAIN/api/health" 2>/dev/null || echo "")
  if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "\n${GREEN}✅ Deployment ready!${NC}"
    break
  fi
  if [ $i -eq 18 ]; then
    echo -e "\n${RED}❌ Deployment timeout after 90 seconds${NC}"
    exit 1
  fi
done

# Step 2: Health Check (already done above, but verify)
echo -e "\n${YELLOW}Step 2: Health Check Verification${NC}"
HEALTH_RESPONSE=$(curl -s "https://$DOMAIN/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

# Step 3: Menu API Test
echo -e "\n${YELLOW}Step 3: Menu API Test${NC}"
MENU_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/public/menu?restaurantId=$RESTAURANT_ID")
if [ "$MENU_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Menu API working (HTTP $MENU_STATUS)${NC}"
else
    echo -e "${RED}❌ Menu API failed (HTTP $MENU_STATUS)${NC}"
    exit 1
fi

# Step 4: Chat API Test
echo -e "\n${YELLOW}Step 4: Chat API Test${NC}"
CHAT_RESPONSE=$(curl -s "https://$DOMAIN/api/chat" \
  -H 'Content-Type: application/json' \
  -H 'X-Widget-Version: 1.0.0' \
  -d "{\"restaurantId\":\"$RESTAURANT_ID\",\"sessionToken\":\"smoke-test\",\"message\":\"Italian dishes?\"}")

if echo "$CHAT_RESPONSE" | grep -q '"reply"' && echo "$CHAT_RESPONSE" | grep -q '"cards"'; then
    echo -e "${GREEN}✅ Chat API working${NC}"
    echo "Response preview: $(echo "$CHAT_RESPONSE" | head -c 100)..."
else
    echo -e "${RED}❌ Chat API failed${NC}"
    echo "Response: $CHAT_RESPONSE"
    exit 1
fi

# Step 5: Rate Limiting Test
echo -e "\n${YELLOW}Step 5: Rate Limiting Test${NC}"
RATE_LIMIT_HITS=0
for i in {1..15}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/chat" \
      -H 'Content-Type: application/json' \
      -d "{\"restaurantId\":\"$RESTAURANT_ID\",\"sessionToken\":\"test\",\"message\":\"test\"}")
    
    if [ "$STATUS" = "429" ]; then
        RATE_LIMIT_HITS=$((RATE_LIMIT_HITS + 1))
    fi
    
    echo -n "."
done

echo ""
if [ $RATE_LIMIT_HITS -gt 0 ]; then
    echo -e "${GREEN}✅ Rate limiting working ($RATE_LIMIT_HITS/15 requests blocked)${NC}"
else
    echo -e "${YELLOW}⚠️  Rate limiting may not be working (0/15 requests blocked)${NC}"
fi

# Step 6: Widget Test
echo -e "\n${YELLOW}Step 6: Widget Accessibility Test${NC}"
WIDGET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/widget.js")
if [ "$WIDGET_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Widget.js accessible${NC}"
else
    echo -e "${RED}❌ Widget.js not accessible (HTTP $WIDGET_STATUS)${NC}"
    exit 1
fi

# Step 7: Security Headers Test
echo -e "\n${YELLOW}Step 7: Security Headers Test${NC}"
HEADERS=$(curl -s -I "https://$DOMAIN/api/chat" | grep -E "(X-Frame-Options|X-Content-Type-Options|Referrer-Policy)")
if echo "$HEADERS" | grep -q "X-Frame-Options: SAMEORIGIN"; then
    echo -e "${GREEN}✅ Security headers present${NC}"
else
    echo -e "${YELLOW}⚠️  Security headers may be missing${NC}"
fi

# Success!
echo -e "\n${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Send pilot email to restaurants"
echo "2. Monitor health endpoint: https://$DOMAIN/api/health"
echo "3. Check Vercel logs for any issues"
echo "4. Set up monitoring alerts"

echo -e "\n${YELLOW}Widget Embed Code:${NC}"
echo "<script src=\"https://$DOMAIN/widget.js\" data-restaurant=\"$RESTAURANT_ID\" defer></script>"

echo -e "\n${GREEN}Ready for pilot restaurants! 🚀${NC}"
