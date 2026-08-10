$json = @{email="admin@erp.com";password="password123"} | ConvertTo-Json
$result = Invoke-RestMethod -Uri http://localhost:3000/api/auth/login -Method POST -Body $json -ContentType "application/json"
$result | ConvertTo-Json -Depth 3
