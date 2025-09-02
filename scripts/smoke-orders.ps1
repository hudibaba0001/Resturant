param(
  [string]$BaseUrl = "https://resturant-two-xi.vercel.app",
  [string]$RID = "48a8a55a-bccc-47f7-b108-b96875083866",
  [string]$TOK = "aa3cf40f-c9c1-4421-b7c7-7d135a6fc865",
  [string]$ITEM = "c4e7f1cf-4e95-4c1b-8db0-5aec50a8ce57"
)

Write-Host "🧪 Testing Orders API endpoints..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Restaurant ID: $RID" -ForegroundColor Gray
Write-Host "Session Token: $TOK" -ForegroundColor Gray
Write-Host "Item ID: $ITEM" -ForegroundColor Gray
Write-Host ""

# Test 1: JSON body path
Write-Host "📝 Testing JSON body path..." -ForegroundColor Yellow
try {
  $body = @{ 
    restaurantId = $RID; 
    sessionToken = $TOK; 
    type = "pickup"; 
    items = @(@{ itemId = $ITEM; qty = 1 }) 
  } | ConvertTo-Json -Compress
  
  $res1 = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/orders" `
    -Headers @{ Origin = "$BaseUrl"; Referer = "$BaseUrl/" } `
    -ContentType "application/json" `
    -Body $body
  
  if ($res1.orderId) {
    Write-Host "✅ JSON path: SUCCESS" -ForegroundColor Green
    Write-Host "   Order ID: $($res1.orderId)" -ForegroundColor Gray
    Write-Host "   Order Code: $($res1.orderCode)" -ForegroundColor Gray
    Write-Host "   Total: $($res1.totalCents) cents" -ForegroundColor Gray
  } else {
    Write-Host "❌ JSON path: FAILED" -ForegroundColor Red
    Write-Host "   Response: $($res1 | ConvertTo-Json)" -ForegroundColor Gray
    exit 1
  }
} catch {
  Write-Host "❌ JSON path: ERROR" -ForegroundColor Red
  Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
  exit 1
}

Write-Host ""

# Test 2: Query fallback path
Write-Host "🔗 Testing query fallback path..." -ForegroundColor Yellow
try {
  $itemsStr = [System.Web.HttpUtility]::UrlEncode("[{""itemId"":""$ITEM"",""qty"":1}]")
  $queryUrl = "$BaseUrl/api/orders?restaurantId=$RID&sessionToken=$TOK&type=pickup&items=$itemsStr"
  
  $res2 = Invoke-RestMethod -Method Post -Uri $queryUrl `
    -Headers @{ Origin = "$BaseUrl"; Referer = "$BaseUrl/" }
  
  if ($res2.orderId) {
    Write-Host "✅ Query path: SUCCESS" -ForegroundColor Green
    Write-Host "   Order ID: $($res2.orderId)" -ForegroundColor Gray
    Write-Host "   Order Code: $($res2.orderCode)" -ForegroundColor Gray
    Write-Host "   Total: $($res2.totalCents) cents" -ForegroundColor Gray
  } else {
    Write-Host "❌ Query path: FAILED" -ForegroundColor Red
    Write-Host "   Response: $($res2 | ConvertTo-Json)" -ForegroundColor Gray
    exit 1
  }
} catch {
  Write-Host "❌ Query path: ERROR" -ForegroundColor Red
  Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
  exit 1
}

Write-Host ""
Write-Host "🎉 All tests passed! Orders API is working correctly." -ForegroundColor Green
Write-Host "   - JSON body: ✅" -ForegroundColor Green
Write-Host "   - Query fallback: ✅" -ForegroundColor Green
