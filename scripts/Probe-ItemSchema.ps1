# Probe-ItemSchema.ps1
# Brute-force test different payload combinations to find the working schema

param(
    [string]$BaseUrl = $Env:BaseUrl,
    [string]$RestaurantId = $Env:RID,
    [string]$MenuId = $Env:MenuId,
    [string]$AdminKey = $Env:ADMIN_KEY
)

if (-not $BaseUrl -or -not $RestaurantId -or -not $MenuId -or -not $AdminKey) {
    Write-Host "ERROR Missing required environment variables:" -ForegroundColor Red
    Write-Host "  BaseUrl: $BaseUrl" -ForegroundColor Yellow
    Write-Host "  RestaurantId: $RestaurantId" -ForegroundColor Yellow  
    Write-Host "  MenuId: $MenuId" -ForegroundColor Yellow
    Write-Host "  AdminKey: $AdminKey" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Set them with:" -ForegroundColor Cyan
    Write-Host "  `$Env:BaseUrl='https://your-app.vercel.app'" -ForegroundColor White
    Write-Host "  `$Env:RID='your-restaurant-uuid'" -ForegroundColor White
    Write-Host "  `$Env:MenuId='your-menu-uuid'" -ForegroundColor White
    Write-Host "  `$Env:ADMIN_KEY='your-admin-key'" -ForegroundColor White
    exit 1
}

Write-Host "Probing Item Schema..." -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor Gray
Write-Host "RestaurantId: $RestaurantId" -ForegroundColor Gray
Write-Host "MenuId: $MenuId" -ForegroundColor Gray
Write-Host ""

# Test combinations
$combinations = @(
    # Combination 1: restaurantId + price_cents + sectionPath
    @{
        name = "restaurantId + price_cents + sectionPath"
        payload = @{
            restaurantId = $RestaurantId
            menu = $MenuId
            name = "Test Item 1"
            price_cents = 990
            currency = "SEK"
            sectionPath = @("Drinks")
        }
    },
    
    # Combination 2: menu_id + price_cents + section_path
    @{
        name = "menu_id + price_cents + section_path"
        payload = @{
            menu_id = $MenuId
            name = "Test Item 2"
            price_cents = 990
            currency = "SEK"
            section_path = @("Drinks")
        }
    },
    
    # Combination 3: restaurant_id + price_ore + section
    @{
        name = "restaurant_id + price_ore + section"
        payload = @{
            restaurant_id = $RestaurantId
            menu = $MenuId
            name = "Test Item 3"
            price_ore = 990
            currency = "SEK"
            section = "Drinks"
        }
    },
    
    # Combination 4: restaurantId + price_cents + section (string)
    @{
        name = "restaurantId + price_cents + section (string)"
        payload = @{
            restaurantId = $RestaurantId
            menu = $MenuId
            name = "Test Item 4"
            price_cents = 990
            currency = "SEK"
            section = "Drinks"
        }
    },
    
    # Combination 5: Minimal required fields only
    @{
        name = "Minimal required fields"
        payload = @{
            restaurantId = $RestaurantId
            menu = $MenuId
            name = "Test Item 5"
            price_cents = 990
            currency = "SEK"
        }
    }
)

$successCount = 0
$winningPayload = $null

foreach ($combo in $combinations) {
    Write-Host "Testing: $($combo.name)" -ForegroundColor Yellow
    
    try {
        $body = $combo.payload | ConvertTo-Json -Compress
        $response = Invoke-RestMethod -Method POST -Uri "$BaseUrl/dashboard/proxy/items" `
            -ContentType "application/json" `
            -Body $body
        
        Write-Host "SUCCESS (201)" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
        $successCount++
        if (-not $winningPayload) {
            $winningPayload = $combo.payload
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 400) {
            try {
                $errorBody = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorBody)
                $errorJson = $reader.ReadToEnd() | ConvertFrom-Json
                
                Write-Host "ERROR 400 BAD_REQUEST" -ForegroundColor Red
                Write-Host "Issues:" -ForegroundColor Red
                foreach ($issue in $errorJson.issues) {
                    Write-Host "  - $($issue.path | Join-String -Separator '.'): $($issue.message)" -ForegroundColor Red
                }
            } catch {
                Write-Host "ERROR 400 BAD_REQUEST (could not parse error)" -ForegroundColor Red
            }
        } else {
            Write-Host "ERROR $statusCode - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

Write-Host "Results Summary:" -ForegroundColor Cyan
Write-Host "Successful combinations: $successCount" -ForegroundColor $(if ($successCount -gt 0) { "Green" } else { "Red" })

if ($winningPayload) {
    Write-Host ""
    Write-Host "WINNING PAYLOAD:" -ForegroundColor Green
    Write-Host ($winningPayload | ConvertTo-Json -Depth 3) -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Test via proxy (should also work):" -ForegroundColor Cyan
    $proxyBody = $winningPayload | ConvertTo-Json -Compress
    Write-Host "Invoke-RestMethod POST `"$BaseUrl/dashboard/proxy/items`" -ContentType `"application/json`" -Body '$proxyBody'" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR No successful combinations found. Check the issues above to fix the schema." -ForegroundColor Red
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. If you got a winning payload, test it via the proxy endpoint" -ForegroundColor White
Write-Host "2. If all failed, fix the API schema based on the Zod issues shown" -ForegroundColor White
Write-Host "3. Re-run this script until you get at least one SUCCESS" -ForegroundColor White
