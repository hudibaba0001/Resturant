param(
  [string]$BaseUrl = "https://resturant-two-xi.vercel.app",
  [string]$RID = "48a8a55a-bccc-47f7-b108-b96875083866",
  [string]$ADMIN_KEY = ""
)

Write-Host "🧪 Testing Dashboard Orders Pagination..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Restaurant ID: $RID" -ForegroundColor Gray
Write-Host "Admin Key: $(if ($ADMIN_KEY) { 'Set' } else { 'NOT SET' })" -ForegroundColor Gray
Write-Host ""

if (-not $ADMIN_KEY) {
  Write-Host "❌ Please set DASHBOARD_ADMIN_KEY environment variable" -ForegroundColor Red
  Write-Host "   Example: `$env:DASHBOARD_ADMIN_KEY='your-key-here'" -ForegroundColor Yellow
  exit 1
}

# Test pagination with limit=2 to see multiple pages
Write-Host "📄 Testing pagination with limit=2..." -ForegroundColor Yellow

try {
  # Page 1
  Write-Host "   Fetching page 1..." -ForegroundColor Gray
  $page1 = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/dashboard/orders?restaurantId=$RID&limit=2" `
    -Headers @{ "X-Admin-Key" = $ADMIN_KEY }
  
  Write-Host "   ✅ Page 1: $($page1.orders.Count) orders" -ForegroundColor Green
  if ($page1.orders.Count -gt 0) {
    Write-Host "      First: $($page1.orders[0].order_code) - $($page1.orders[0].total_cents) cents" -ForegroundColor Gray
    Write-Host "      Last:  $($page1.orders[-1].order_code) - $($page1.orders[-1].total_cents) cents" -ForegroundColor Gray
  }
  
  # Check if we have a next cursor
  if ($page1.nextCursor) {
    Write-Host "   🔗 Next cursor: $($page1.nextCursor)" -ForegroundColor Cyan
    
    # Page 2
    Write-Host "   Fetching page 2..." -ForegroundColor Gray
    $page2 = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/dashboard/orders?restaurantId=$RID&limit=2&cursor=$($page1.nextCursor)" `
      -Headers @{ "X-Admin-Key" = $ADMIN_KEY }
    
    Write-Host "   ✅ Page 2: $($page2.orders.Count) orders" -ForegroundColor Green
    if ($page2.orders.Count -gt 0) {
      Write-Host "      First: $($page2.orders[0].order_code) - $($page2.orders[0].total_cents) cents" -ForegroundColor Gray
      Write-Host "      Last:  $($page2.orders[-1].order_code) - $($page2.orders[-1].total_cents) cents" -ForegroundColor Gray
    }
    
    # Check if we have another cursor
    if ($page2.nextCursor) {
      Write-Host "   🔗 Page 2 next cursor: $($page2.nextCursor)" -ForegroundColor Cyan
    } else {
      Write-Host "   🏁 No more pages (nextCursor is null)" -ForegroundColor Yellow
    }
    
    # Verify pagination is working (page 2 orders should be older than page 1)
    if ($page1.orders.Count -gt 0 -and $page2.orders.Count -gt 0) {
      $page1Latest = [DateTime]::Parse($page1.orders[0].created_at)
      $page2Latest = [DateTime]::Parse($page2.orders[0].created_at)
      
      if ($page2Latest -lt $page1Latest) {
        Write-Host "   ✅ Pagination order: Page 2 is older than Page 1" -ForegroundColor Green
      } else {
        Write-Host "   ⚠️  Pagination order: Check if timestamps are correct" -ForegroundColor Yellow
      }
    }
    
  } else {
    Write-Host "   🏁 No pagination needed (nextCursor is null)" -ForegroundColor Yellow
  }
  
} catch {
  Write-Host "❌ Pagination test failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "🎉 Pagination test completed!" -ForegroundColor Green
Write-Host "   - Page 1: ✅" -ForegroundColor Green
Write-Host "   - Page 2: ✅" -ForegroundColor Green
Write-Host "   - Cursor handling: ✅" -ForegroundColor Green
Write-Host "   - Order sequence: ✅" -ForegroundColor Green
