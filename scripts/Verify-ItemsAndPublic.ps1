param(
  [string]$BaseUrl = "https://resturant-two-xi.vercel.app",
  [string]$RestaurantId = "64806e5b-714f-4388-a092-29feff9b64c0"
)

$ErrorActionPreference = 'Stop'

function Write-Header($text) { Write-Host "`n=== $text ===" }

function Get-Body($resp) {
  try {
    return ($resp | ConvertTo-Json -Compress)
  } catch { return ($resp | Out-String) }
}

# 1) PATCH happy-path
Write-Header '1) PATCH happy-path'
$createBody = @{ restaurantId=$RestaurantId; menu='main'; name='PatchSmoke'; price_cents=111; currency='SEK'; section_path=@('Drinks') } | ConvertTo-Json -Compress
$created = Invoke-RestMethod -Method POST -Uri "$BaseUrl/dashboard/proxy/items" -ContentType 'application/json' -Body $createBody
$id = if ($created.id) { $created.id } elseif ($created.data) { $created.data.id } else { throw 'Create did not return id' }
"CREATED: $id"

$patchBody = @{ price_cents=490; is_available=$true } | ConvertTo-Json -Compress
$patched = Invoke-RestMethod -Method PATCH -Uri "$BaseUrl/dashboard/proxy/items/$id" -ContentType 'application/json' -Body $patchBody
"PATCHED: OK"

$got = Invoke-RestMethod -Method GET -Uri "$BaseUrl/dashboard/proxy/items/$id"
if ($got.data) { $got = $got.data }
$verify = [PSCustomObject]@{ id=$got.id; name=$got.name; price_cents=$got.price_cents; price=$got.price; is_available=$got.is_available }
$verify | Format-List | Out-String | Write-Output

# 2) PATCH negative (Zod issues)
Write-Header '2) PATCH negative (Zod issues)'
$bad = @{ price_cents=-1 } | ConvertTo-Json -Compress
try {
  Invoke-WebRequest -Method PATCH -Uri "$BaseUrl/dashboard/proxy/items/$id" -ContentType 'application/json' -Body $bad -ErrorAction Stop | Out-Null
  Write-Output 'Unexpected 2xx'
} catch {
  $resp=$_.Exception.Response; $s=$resp.GetResponseStream(); $rd=New-Object IO.StreamReader($s)
  $txt=$rd.ReadToEnd(); $rd.Close(); $s.Close();
  Write-Output $resp.StatusCode
  Write-Output $txt
}

# 3) Section delete guard (expect 409)
Write-Header '3) Section delete guard'
$secs = Invoke-RestMethod -Method GET -Uri "$BaseUrl/dashboard/proxy/menus/sections?restaurantId=$RestaurantId&menu=main&limit=50"
$sid = ($secs.data | Where-Object { $_.name -eq 'Drinks' } | Select-Object -First 1).id
"Drinks SID: $sid"
if (-not $sid) { Write-Output 'No Drinks section found'; } else {
  try {
    Invoke-WebRequest -Method DELETE -Uri "$BaseUrl/dashboard/proxy/menus/sections/$sid" -ErrorAction Stop | Out-Null
    Write-Output 'Unexpected 2xx'
  } catch {
    $resp=$_.Exception.Response; $s=$resp.GetResponseStream(); $rd=New-Object IO.StreamReader($s)
    $txt=$rd.ReadToEnd(); $rd.Close(); $s.Close();
    Write-Output ([int]$resp.StatusCode)
    Write-Output $txt
  }
}

# 4) Public menu API (headers + body)
Write-Header '4) Public menu API'
cmd /c "curl -sS -i `"$BaseUrl/api/public/menu?restaurantId=$RestaurantId&menu=main`" | head -n 40 | cat"


