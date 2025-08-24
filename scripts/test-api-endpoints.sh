#!/bin/bash

# Widget Core API Testing Script
# Run this against your local development server

set -e

# Configuration
BASE_URL="http://localhost:3000"
RESTAURANT_ID="64806e5b-714f-4388-a092-29feff9b64c0"  # Replace with your restaurant ID
SESSION_TOKEN="test-session-$(date +%s)"

echo "🧪 Testing Widget Core API Endpoints..."
echo "📊 Base URL: $BASE_URL"
echo "🏪 Restaurant ID: $RESTAURANT_ID"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local headers="$5"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" $headers)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" $headers -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ PASS${NC} ($http_code)"
        echo "   Response: $body" | head -c 100
        echo ""
    else
        echo -e "${RED}❌ FAIL${NC} ($http_code)"
        echo "   Error: $body"
        echo ""
    fi
}

# Test 1: Status endpoint
echo "=== Testing Status Endpoint ==="
test_endpoint "Status Check" "GET" "$BASE_URL/api/public/status?restaurant_id=$RESTAURANT_ID"

# Test 2: Session creation
echo "=== Testing Session Endpoint ==="
session_data="{\"restaurant_id\":\"$RESTAURANT_ID\",\"session_token\":\"$SESSION_TOKEN\",\"origin\":\"https://demo.example\",\"user_agent\":\"TestAgent/1.0\"}"
test_endpoint "Create Session" "POST" "$BASE_URL/api/public/session" "$session_data" "-H \"Origin: https://demo.example\""

# Test 3: Event logging
echo "=== Testing Events Endpoint ==="
event_data="{\"restaurant_id\":\"$RESTAURANT_ID\",\"session_id\":\"$SESSION_TOKEN\",\"type\":\"open\",\"payload\":{\"source\":\"test-script\"}}"
test_endpoint "Log Event" "POST" "$BASE_URL/api/public/events" "$event_data" "-H \"Origin: https://demo.example\""

# Test 4: Status with invalid restaurant
echo "=== Testing Error Handling ==="
test_endpoint "Invalid Restaurant" "GET" "$BASE_URL/api/public/status?restaurant_id=invalid-uuid"

# Test 5: Session with disallowed origin
echo "=== Testing Origin Validation ==="
session_data_evil="{\"restaurant_id\":\"$RESTAURANT_ID\",\"session_token\":\"evil-session-$(date +%s)\",\"origin\":\"https://evil.example\",\"user_agent\":\"TestAgent/1.0\"}"
test_endpoint "Disallowed Origin" "POST" "$BASE_URL/api/public/session" "$session_data_evil" "-H \"Origin: https://evil.example\""

# Test 6: Missing required fields
echo "=== Testing Validation ==="
invalid_data="{\"restaurant_id\":\"$RESTAURANT_ID\"}"
test_endpoint "Missing Fields" "POST" "$BASE_URL/api/public/session" "$invalid_data"

echo ""
echo "🎉 API endpoint testing completed!"
echo ""
echo "📝 Next steps:"
echo "1. Check the responses above for any errors"
echo "2. Run the database contract tests: npm run test:db"
echo "3. Run the SQL tests: scripts/test_widget_core.sql"
echo "4. Test the widget on your demo page"
