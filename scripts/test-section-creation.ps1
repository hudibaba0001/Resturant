# Test Section Creation API
$BaseUrl = "https://resturant-two-xi.vercel.app"
$RestaurantId = "64806e5b-714f-4388-a092-29feff9b64c0"  # From your test data

Write-Host "🧪 Testing Section Creation API..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Restaurant ID: $RestaurantId" -ForegroundColor Gray
Write-Host ""

# Test 1: Create a new section
Write-Host "📝 Creating new section 'Appetizers'..." -ForegroundColor Yellow

$Body = @{
    menu_id = $RestaurantId
    name = "Appetizers"
} | ConvertTo-Json -Compress

try {
    $response = Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/dashboard/menus/sections" `
        -Body $Body -ContentType "application/json"
    
    Write-Host "✅ Section created successfully!" -ForegroundColor Green
    Write-Host "   Section ID: $($response.section.id)" -ForegroundColor Gray
    Write-Host "   Section Name: $($response.section.name)" -ForegroundColor Gray
    Write-Host "   Restaurant ID: $($response.section.restaurant_id)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Failed to create section: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorBody = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorBody)
            $errorContent = $reader.ReadToEnd()
            Write-Host "   Error Details: $errorContent" -ForegroundColor Red
        } catch {
            Write-Host "   Could not read error details" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "🎯 Test completed!" -ForegroundColor Cyan
