$url = "https://resturant-two-xi.vercel.app/dashboard/_api/menus/sections?restaurant_id=64806e5b-714f-4388-a092-29feff9b64c0"

Write-Host "Testing proxy route: $url"

try {
    $response = Invoke-WebRequest -Uri $url -Method GET
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
