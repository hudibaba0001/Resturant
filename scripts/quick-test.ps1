# Quick API Test Scripts for P0 Pickup Verification

$BASE_URL = "https://resturant-git-feat-data-spine-lovedeep-singhs-projects-96b003a8.vercel.app"
$RESTAURANT_ID = "64806e5b-714f-4388-a092-29feff9b64c0"

Write-Host "Quick P0 Pickup Tests" -ForegroundColor Green

# 1. Health Check
Write-Host "`n1. Testing Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Health Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Menu API
Write-Host "`n2. Testing Menu API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/public/menu?restaurantId=$RESTAURANT_ID" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $menu = $response.Content | ConvertFrom-Json
        Write-Host "✅ Menu OK - $($menu.sections.Count) sections" -ForegroundColor Green
    } else {
        Write-Host "❌ Menu Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Menu Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Chat API
Write-Host "`n3. Testing Chat API..." -ForegroundColor Yellow
try {
    $body = @{
        restaurantId = $RESTAURANT_ID
        sessionToken = "quick_test"
        message = "Italian dishes?"
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
        "X-Widget-Version" = "1.0.0"
    }

    $response = Invoke-WebRequest -Uri "$BASE_URL/api/chat" -Method POST -Body $body -Headers $headers -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        $chat = $response.Content | ConvertFrom-Json
        Write-Host "✅ Chat OK - $($chat.cards.Count) cards" -ForegroundColor Green
    } else {
        Write-Host "❌ Chat Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Chat Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nQuick Tests Complete!" -ForegroundColor Green
