$BaseUrl = "https://resturant-two-xi.vercel.app"
$RID     = "64806e5b-714f-4388-a092-29feff9b64c0"
$NAME    = "PS-" + (Get-Random)

Write-Host "Testing proxy routes..."
Write-Host "Base URL: $BaseUrl"
Write-Host "Restaurant ID: $RID"
Write-Host "Test section name: $NAME"

# Create
Write-Host "`n1. Creating section..."
try {
    $create = Invoke-RestMethod -Method POST `
        -Uri "$BaseUrl/dashboard/_api/menus/sections" `
        -ContentType "application/json" `
        -Body (@{ restaurant_id = $RID; name = $NAME } | ConvertTo-Json -Compress)
    Write-Host "✅ Create successful:"
    $create | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Create failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}

# List
Write-Host "`n2. Listing sections..."
try {
    $list = Invoke-RestMethod "$BaseUrl/dashboard/_api/menus/sections?restaurant_id=$RID"
    Write-Host "✅ List successful:"
    $list | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ List failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}

# Update (if we have a section)
Write-Host "`n3. Updating section..."
try {
    $list = Invoke-RestMethod "$BaseUrl/dashboard/_api/menus/sections?restaurant_id=$RID"
    $secId = ($list.sections | Where-Object { $_.name -eq $NAME } | Select-Object -First 1).id
    if ($secId) {
        $new = "$NAME-EDIT"
        $upd = Invoke-RestMethod -Method PATCH `
            -Uri "$BaseUrl/dashboard/_api/menus/sections/$secId" `
            -ContentType "application/json" `
            -Body (@{ name = $new } | ConvertTo-Json -Compress) `
            -MaximumRedirection 5
        Write-Host "✅ Update successful:"
        $upd | ConvertTo-Json -Depth 10
    } else {
        Write-Host "⚠️ No section found to update"
    }
} catch {
    Write-Host "❌ Update failed: $($_.Exception.Message)"
}

# Delete (if we have a section)
Write-Host "`n4. Deleting section..."
try {
    $list = Invoke-RestMethod "$BaseUrl/dashboard/_api/menus/sections?restaurant_id=$RID"
    $secId = ($list.sections | Where-Object { $_.name -like "$NAME*" } | Select-Object -First 1).id
    if ($secId) {
        Invoke-RestMethod -Method DELETE `
            -Uri "$BaseUrl/dashboard/_api/menus/sections/$secId" `
            -MaximumRedirection 5
        Write-Host "✅ Delete successful"
    } else {
        Write-Host "⚠️ No section found to delete"
    }
} catch {
    Write-Host "❌ Delete failed: $($_.Exception.Message)"
}

# Verify
Write-Host "`n5. Final verification..."
try {
    $final = Invoke-RestMethod "$BaseUrl/dashboard/_api/menus/sections?restaurant_id=$RID"
    Write-Host "✅ Final list:"
    $final | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Final verification failed: $($_.Exception.Message)"
}

Write-Host "`nProxy test completed!"
