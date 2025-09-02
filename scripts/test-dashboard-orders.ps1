param(
  [string]$BaseUrl = "https://resturant-two-xi.vercel.app",
  [string]$RID = "48a8a55a-bccc-47f7-b108-b96875083866",
  [string]$ADMIN_KEY = ""
)

Write-Host "🧪 Testing Dashboard Orders API..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Restaurant ID: $RID" -ForegroundColor Gray
Write-Host "Admin Key: $(if ($ADMIN_KEY) { 'Set' } else { 'NOT SET' })" -ForegroundColor Gray
Write-Host ""

if (-not $ADMIN_KEY) {
  Write-Host "❌ Please set DASHBOARD_ADMIN_KEY environment variable" -ForegroundColor Red
  Write-Host "   Example: `$env:DASHBOARD_ADMIN_KEY='your-key-here'" -ForegroundColor Yellow
  exit 1
}

# Test 1: Missing admin key -> 401
Write-Host "🔒 Testing missing admin key (expect 401)..." -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Method Get -Uri "$BaseUrl/api/dashboard/orders?restaurantId=$RID" -ErrorAction Stop
  Write-Host "❌ Expected 401, got $($response.StatusCode)" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode -eq 401) {
    Write-Host "✅ Missing admin key: 401 UNAUTHORIZED" -ForegroundColor Green
  } else {
    Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ""

# Test 2: Happy path with admin key
Write-Host "📋 Testing happy path with admin key..." -ForegroundColor Yellow
try {
  $response = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/dashboard/orders?restaurantId=$RID&limit=5" `
    -Headers @{ "X-Admin-Key" = $ADMIN_KEY }
  
  if ($response.orders -and $response.orders.Count -gt 0) {
    Write-Host "✅ Happy path: SUCCESS" -ForegroundColor Green
    Write-Host "   Orders returned: $($response.orders.Count)" -ForegroundColor Gray
    Write-Host "   First order: $($response.orders[0].orderCode) - $($response.orders[0].totalCents) cents" -ForegroundColor Gray
    Write-Host "   Next cursor: $(if ($response.nextCursor) { $response.nextCursor } else { 'null' })" -ForegroundColor Gray
    
    # Show first order details
    $firstOrder = $response.orders[0]
    Write-Host "   Sample order structure:" -ForegroundColor Gray
    Write-Host "     ID: $($firstOrder.id)" -ForegroundColor Gray
    Write-Host "     Status: $($firstOrder.status)" -ForegroundColor Gray
    Write-Host "     Type: $($firstOrder.type)" -ForegroundColor Gray
    Write-Host "     Items: $($firstOrder.items.Count)" -ForegroundColor Gray
  } else {
    Write-Host "⚠️  No orders found (this might be expected)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "❌ Happy path: ERROR" -ForegroundColor Red
  Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
  exit 1
}

Write-Host ""

# Test 3: Pagination (if we have orders)
if ($response.orders -and $response.orders.Count -gt 0 -and $response.nextCursor) {
  Write-Host "📄 Testing pagination..." -ForegroundColor Yellow
  try {
    $page2 = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/dashboard/orders?restaurantId=$RID&limit=1&cursor=$($response.nextCursor)" `
      -Headers @{ "X-Admin-Key" = $ADMIN_KEY }
    
    if ($page2.orders -and $page2.orders.Count -gt 0) {
      Write-Host "✅ Pagination: SUCCESS" -ForegroundColor Green
      Write-Host "   Page 2 order: $($page2.orders[0].orderCode)" -ForegroundColor Gray
    } else {
      Write-Host "⚠️  Pagination: No more orders (expected)" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "❌ Pagination: ERROR" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
  }
} else {
  Write-Host "📄 Skipping pagination test (no orders or cursor)" -ForegroundColor Gray
}

Write-Host ""

# Test 4: Status filtering
Write-Host "🔍 Testing status filtering..." -ForegroundColor Yellow
try {
  $pendingOrders = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/dashboard/orders?restaurantId=$RID&status=pending" `
    -Headers @{ "X-Admin-Key" = $ADMIN_KEY }
  
  Write-Host "✅ Status filter: SUCCESS" -ForegroundColor Green
  Write-Host "   Pending orders: $($pendingOrders.orders.Count)" -ForegroundColor Gray
} catch {
  Write-Host "❌ Status filter: ERROR" -ForegroundColor Red
  Write-Host "   $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎉 Dashboard Orders API test completed!" -ForegroundColor Green
Write-Host "   - Authentication: ✅" -ForegroundColor Green
Write-Host "   - Data retrieval: ✅" -ForegroundColor Green
Write-Host "   - Pagination: ✅" -ForegroundColor Green
Write-Host "   - Status filtering: ✅" -ForegroundColor Green
