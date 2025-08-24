# Widget Core API Testing Script (PowerShell)
# Run this against your local development server

# Configuration
$BASE_URL = "http://localhost:3000"
$RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0"  # Replace with your restaurant ID
$SESSION_TOKEN = "test-session-$(Get-Date -UFormat %s)"

Write-Host "🧪 Testing Widget Core API Endpoints..." -ForegroundColor Cyan
Write-Host "📊 Base URL: $BASE_URL" -ForegroundColor Yellow
Write-Host "🏪 Restaurant ID: $RESTAURANT_ID" -ForegroundColor Yellow
Write-Host ""

# Test function
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Data = $null,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Data) {
            $params.Body = $Data
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        $statusCode = 200  # Invoke-RestMethod doesn't return status code directly
        
        Write-Host "✅ PASS" -ForegroundColor Green
        Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ FAIL ($statusCode)" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Test 1: Status endpoint
Write-Host "=== Testing Status Endpoint ===" -ForegroundColor Magenta
Test-Endpoint -Name "Status Check" -Method "GET" -Url "$BASE_URL/api/public/status?restaurant_id=$RESTAURANT_ID"

# Test 2: Session creation
Write-Host "=== Testing Session Endpoint ===" -ForegroundColor Magenta
$sessionData = @{
    restaurant_id = $RESTAURANT_ID
    session_token = $SESSION_TOKEN
    origin = "https://demo.example"
    user_agent = "TestAgent/1.0"
} | ConvertTo-Json

$headers = @{
    "Origin" = "https://demo.example"
}

Test-Endpoint -Name "Create Session" -Method "POST" -Url "$BASE_URL/api/public/session" -Data $sessionData -Headers $headers

# Test 3: Event logging
Write-Host "=== Testing Events Endpoint ===" -ForegroundColor Magenta
$eventData = @{
    restaurant_id = $RESTAURANT_ID
    session_id = $SESSION_TOKEN
    type = "open"
    payload = @{
        source = "test-script"
    }
} | ConvertTo-Json

Test-Endpoint -Name "Log Event" -Method "POST" -Url "$BASE_URL/api/public/events" -Data $eventData -Headers $headers

# Test 4: Status with invalid restaurant
Write-Host "=== Testing Error Handling ===" -ForegroundColor Magenta
Test-Endpoint -Name "Invalid Restaurant" -Method "GET" -Url "$BASE_URL/api/public/status?restaurant_id=invalid-uuid"

# Test 5: Session with disallowed origin
Write-Host "=== Testing Origin Validation ===" -ForegroundColor Magenta
$evilSessionData = @{
    restaurant_id = $RESTAURANT_ID
    session_token = "evil-session-$(Get-Date -UFormat %s)"
    origin = "https://evil.example"
    user_agent = "TestAgent/1.0"
} | ConvertTo-Json

$evilHeaders = @{
    "Origin" = "https://evil.example"
}

Test-Endpoint -Name "Disallowed Origin" -Method "POST" -Url "$BASE_URL/api/public/session" -Data $evilSessionData -Headers $evilHeaders

# Test 6: Missing required fields
Write-Host "=== Testing Validation ===" -ForegroundColor Magenta
$invalidData = @{
    restaurant_id = $RESTAURANT_ID
} | ConvertTo-Json

Test-Endpoint -Name "Missing Fields" -Method "POST" -Url "$BASE_URL/api/public/session" -Data $invalidData

Write-Host ""
Write-Host "🎉 API endpoint testing completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Check the responses above for any errors" -ForegroundColor White
Write-Host "2. Run the database contract tests: npm run test:db" -ForegroundColor White
Write-Host "3. Run the SQL tests: scripts/test_widget_core.sql" -ForegroundColor White
Write-Host "4. Test the widget on your demo page" -ForegroundColor White
