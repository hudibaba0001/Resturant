# Get-TestIds.ps1
# Get restaurant and menu IDs for testing

param(
    [string]$BaseUrl = "https://resturant-two-xi.vercel.app"
)

Write-Host "Getting test IDs..." -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor Gray
Write-Host ""

try {
    # Get restaurants
    Write-Host "Getting restaurants..." -ForegroundColor Yellow
    $restaurants = Invoke-RestMethod -Uri "$BaseUrl/api/restaurants"
    
    if ($restaurants -and $restaurants.Count -gt 0) {
        $restaurantId = $restaurants[0].id
        Write-Host "SUCCESS Restaurant ID: $restaurantId" -ForegroundColor Green
        
        # Get menus for this restaurant
        Write-Host "Getting menus..." -ForegroundColor Yellow
        $menus = Invoke-RestMethod -Uri "$BaseUrl/api/menus?restaurantId=$restaurantId"
        
        if ($menus -and $menus.menus -and $menus.menus.Count -gt 0) {
            $menuId = $menus.menus[0].id
            Write-Host "SUCCESS Menu ID: $menuId" -ForegroundColor Green
            
            Write-Host ""
            Write-Host "Set these environment variables:" -ForegroundColor Cyan
            Write-Host "`$Env:BaseUrl='$BaseUrl'" -ForegroundColor White
            Write-Host "`$Env:RID='$restaurantId'" -ForegroundColor White
            Write-Host "`$Env:MenuId='$menuId'" -ForegroundColor White
            Write-Host "`$Env:ADMIN_KEY='your-admin-key-here'" -ForegroundColor White
            Write-Host ""
            Write-Host "Then run: ./scripts/Probe-ItemSchema.ps1" -ForegroundColor Cyan
            
        } else {
            Write-Host "ERROR No menus found for restaurant" -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR No restaurants found" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
