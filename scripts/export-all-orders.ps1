param(
  [string]$BaseUrl = "https://resturant-two-xi.vercel.app",
  [string]$RID = "48a8a55a-bccc-47f7-b108-b96875083866",
  [string]$ADMIN_KEY = "",
  [string]$OutputFile = "all-orders.json"
)

Write-Host "📊 Exporting ALL orders for restaurant..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Restaurant ID: $RID" -ForegroundColor Gray
Write-Host "Output: $OutputFile" -ForegroundColor Gray
Write-Host ""

if (-not $ADMIN_KEY) {
  Write-Host "❌ Please set DASHBOARD_ADMIN_KEY environment variable" -ForegroundColor Red
  Write-Host "   Example: `$env:DASHBOARD_ADMIN_KEY='your-key-here'" -ForegroundColor Yellow
  exit 1
}

$allOrders = @()
$pageCount = 0
$cursor = $null
$limit = 50  # Fetch 50 orders per page for efficiency

do {
  $pageCount++
  Write-Host "📄 Fetching page $pageCount..." -ForegroundColor Yellow
  
  # Build URL with cursor if we have one
  $url = "$BaseUrl/api/dashboard/orders?restaurantId=$RID&limit=$limit"
  if ($cursor) {
    $url += "&cursor=$cursor"
  }
  
  try {
    $response = Invoke-RestMethod -Method Get -Uri $url `
      -Headers @{ "X-Admin-Key" = $ADMIN_KEY }
    
    if ($response.orders -and $response.orders.Count -gt 0) {
      $allOrders += $response.orders
      Write-Host "   ✅ Got $($response.orders.Count) orders (Total: $($allOrders.Count))" -ForegroundColor Green
      
      # Update cursor for next page
      $cursor = $response.nextCursor
      
      if ($cursor) {
        $cursorPreview = if ($cursor.Length -gt 8) { $cursor.Substring(0, 8) + "..." } else { $cursor }
        Write-Host "   Next cursor: $cursorPreview" -ForegroundColor Cyan
      }
    } else {
      Write-Host "   ⚠️  No orders in this page" -ForegroundColor Yellow
      break
    }
    
  } catch {
    Write-Host "❌ Failed to fetch page $pageCount: $($_.Exception.Message)" -ForegroundColor Red
    break
  }
  
  # Safety check to prevent infinite loops
  if ($pageCount -gt 100) {
    Write-Host "⚠️  Stopping at 100 pages for safety" -ForegroundColor Yellow
    break
  }
  
} while ($cursor)

Write-Host ""
Write-Host "📊 Export Summary:" -ForegroundColor Cyan
Write-Host "   Total pages: $pageCount" -ForegroundColor Gray
Write-Host "   Total orders: $($allOrders.Count)" -ForegroundColor Gray

if ($allOrders.Count -gt 0) {
  # Add metadata
  $exportData = @{
    exported_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    restaurant_id = $RID
    total_orders = $allOrders.Count
    orders = $allOrders
  }
  
  # Export to JSON
  $exportData | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8
  
  Write-Host "✅ Exported to: $OutputFile" -ForegroundColor Green
  
  # Show sample data
  Write-Host ""
  Write-Host "📋 Sample order data:" -ForegroundColor Cyan
  $sample = $allOrders[0]
  Write-Host "   Order Code: $($sample.order_code)" -ForegroundColor Gray
  Write-Host "   Status: $($sample.status)" -ForegroundColor Gray
  Write-Host "   Total: $($sample.total_cents) cents" -ForegroundColor Gray
  Write-Host "   Created: $($sample.created_at)" -ForegroundColor Gray
  
} else {
  Write-Host "⚠️  No orders to export" -ForegroundColor Yellow
}
