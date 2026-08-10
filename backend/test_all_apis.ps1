# ============================================
# FULL API TEST SCRIPT - Mini ERP + CRM
# Tests every endpoint against live Render backend
# ============================================

$baseUrl = "https://mini-erp-crm-api-t9uv.onrender.com/api"
$errors = @()
$pass = 0

function Test-API {
    param($Method, $Url, $Body, $Token, $Name)
    
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    
    try {
        $params = @{
            Uri = "$baseUrl$Url"
            Method = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 5) }
        
        $response = Invoke-RestMethod @params
        Write-Host "  PASS: $Name" -ForegroundColor Green
        $script:pass++
        return $response
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $errorBody = ""
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
        } catch {}
        Write-Host "  FAIL: $Name -> Status: $status | $errorBody" -ForegroundColor Red
        $script:errors += "$Name -> Status: $status | $errorBody"
        return $null
    }
}

Write-Host "`n========== TESTING AUTH ==========" -ForegroundColor Cyan

# Login as Admin
$loginResult = Test-API -Method "POST" -Url "/auth/login" -Body @{email="admin@erp.com"; password="password123"} -Name "Login Admin"
$adminToken = $loginResult.token

# Login as Sales
$salesLogin = Test-API -Method "POST" -Url "/auth/login" -Body @{email="sales@erp.com"; password="password123"} -Name "Login Sales"

# Login as Warehouse
$whLogin = Test-API -Method "POST" -Url "/auth/login" -Body @{email="warehouse@erp.com"; password="password123"} -Name "Login Warehouse"

# Login as Accounts
$accLogin = Test-API -Method "POST" -Url "/auth/login" -Body @{email="accounts@erp.com"; password="password123"} -Name "Login Accounts"

# Get Profile
Test-API -Method "GET" -Url "/auth/me" -Token $adminToken -Name "Get Profile (Admin)"

Write-Host "`n========== TESTING CUSTOMERS ==========" -ForegroundColor Cyan

# List customers
$customers = Test-API -Method "GET" -Url "/customers?page=1&limit=10" -Token $adminToken -Name "List Customers"

# Search customers
Test-API -Method "GET" -Url "/customers?search=rajesh" -Token $adminToken -Name "Search Customers"

# Create customer
$newCustomer = Test-API -Method "POST" -Url "/customers" -Token $adminToken -Name "Create Customer" -Body @{
    name = "Test Customer API"
    mobile = "9999999999"
    email = "testapi@customer.com"
    business_name = "Test API Business"
    customer_type = "Retail"
    address = "Test Address 123"
    status = "Lead"
}

# Get customer by ID
$customerId = $null
if ($customers.data -and $customers.data.Count -gt 0) {
    $customerId = $customers.data[0].id
    Test-API -Method "GET" -Url "/customers/$customerId" -Token $adminToken -Name "Get Customer Detail"
} elseif ($newCustomer) {
    $customerId = $newCustomer.id
    Test-API -Method "GET" -Url "/customers/$customerId" -Token $adminToken -Name "Get Customer Detail"
}

# Update customer (PUT)
if ($customerId) {
    Test-API -Method "PUT" -Url "/customers/$customerId" -Token $adminToken -Name "Update Customer (PUT)" -Body @{
        status = "Active"
        notes = "Updated via API test"
    }
}

# Update customer (PATCH)
if ($customerId) {
    Test-API -Method "PATCH" -Url "/customers/$customerId" -Token $adminToken -Name "Update Customer (PATCH)" -Body @{
        notes = "Updated via PATCH"
    }
}

# Add follow-up
if ($customerId) {
    Test-API -Method "POST" -Url "/customers/$customerId/follow-ups" -Token $adminToken -Name "Add Follow-up" -Body @{
        notes = "Test follow-up note from API"
        next_follow_up_date = "2026-08-20"
    }
}

# Get follow-ups
if ($customerId) {
    Test-API -Method "GET" -Url "/customers/$customerId/follow-ups" -Token $adminToken -Name "Get Follow-ups"
}

Write-Host "`n========== TESTING PRODUCTS ==========" -ForegroundColor Cyan

# List products
$products = Test-API -Method "GET" -Url "/products?page=1&limit=10" -Token $adminToken -Name "List Products"

# Search products
Test-API -Method "GET" -Url "/products?search=rice" -Token $adminToken -Name "Search Products"

# Low stock
Test-API -Method "GET" -Url "/products/low-stock" -Token $adminToken -Name "Low Stock Products"

# Create product
$newProduct = Test-API -Method "POST" -Url "/products" -Token $adminToken -Name "Create Product" -Body @{
    name = "Test Product API"
    sku = "TEST-API-001"
    category = "Test"
    unit_price = 100.00
    current_stock = 50
    min_stock_alert = 10
    location_warehouse = "Warehouse Test"
}

# Get product by ID
$productId = $null
if ($products.data -and $products.data.Count -gt 0) {
    $productId = $products.data[0].id
    Test-API -Method "GET" -Url "/products/$productId" -Token $adminToken -Name "Get Product Detail"
}

# Update product (PUT)
if ($productId) {
    Test-API -Method "PUT" -Url "/products/$productId" -Token $adminToken -Name "Update Product (PUT)" -Body @{
        min_stock_alert = 25
    }
}

# Update product (PATCH)
if ($productId) {
    Test-API -Method "PATCH" -Url "/products/$productId" -Token $adminToken -Name "Update Product (PATCH)" -Body @{
        min_stock_alert = 20
    }
}

# Add stock movement IN
if ($productId) {
    Test-API -Method "POST" -Url "/products/$productId/stock-movements" -Token $adminToken -Name "Stock Movement IN" -Body @{
        quantity_changed = 10
        movement_type = "IN"
        reason = "API test restock"
    }
}

# Add stock movement OUT
if ($productId) {
    Test-API -Method "POST" -Url "/products/$productId/stock-movements" -Token $adminToken -Name "Stock Movement OUT" -Body @{
        quantity_changed = 5
        movement_type = "OUT"
        reason = "API test removal"
    }
}

# Get stock movements
if ($productId) {
    Test-API -Method "GET" -Url "/products/$productId/stock-movements" -Token $adminToken -Name "Get Stock Movements"
}

Write-Host "`n========== TESTING CHALLANS ==========" -ForegroundColor Cyan

# List challans
$challans = Test-API -Method "GET" -Url "/challans?page=1&limit=10" -Token $adminToken -Name "List Challans"

# Get product IDs for challan creation
$prodForChallan = $null
$prodForChallan2 = $null
if ($products.data -and $products.data.Count -ge 2) {
    $prodForChallan = $products.data[0].id
    $prodForChallan2 = $products.data[1].id
} elseif ($products.data -and $products.data.Count -ge 1) {
    $prodForChallan = $products.data[0].id
}

# Create challan (Draft)
$draftChallan = $null
if ($customerId -and $prodForChallan) {
    $draftChallan = Test-API -Method "POST" -Url "/challans" -Token $adminToken -Name "Create Challan (Draft)" -Body @{
        customer_id = $customerId
        status = "Draft"
        items = @(
            @{ product_id = $prodForChallan; quantity = 2 }
        )
    }
}

# Get challan detail
if ($draftChallan) {
    $draftId = $draftChallan.id
    Test-API -Method "GET" -Url "/challans/$draftId" -Token $adminToken -Name "Get Challan Detail"
}

# Confirm challan (PATCH)
if ($draftChallan) {
    $draftId = $draftChallan.id
    Test-API -Method "PATCH" -Url "/challans/$draftId/confirm" -Token $adminToken -Name "Confirm Challan (PATCH)"
}

# Create another draft to test PUT confirm
$draftChallan2 = $null
if ($customerId -and $prodForChallan) {
    $draftChallan2 = Test-API -Method "POST" -Url "/challans" -Token $adminToken -Name "Create Challan 2 (Draft)" -Body @{
        customer_id = $customerId
        status = "Draft"
        items = @(
            @{ product_id = $prodForChallan; quantity = 1 }
        )
    }
}

# Confirm challan (PUT)
if ($draftChallan2) {
    $draftId2 = $draftChallan2.id
    Test-API -Method "PUT" -Url "/challans/$draftId2/confirm" -Token $adminToken -Name "Confirm Challan (PUT)"
}

# Create another draft to test POST confirm
$draftChallan3 = $null
if ($customerId -and $prodForChallan) {
    $draftChallan3 = Test-API -Method "POST" -Url "/challans" -Token $adminToken -Name "Create Challan 3 (Draft)" -Body @{
        customer_id = $customerId
        status = "Draft"
        items = @(
            @{ product_id = $prodForChallan; quantity = 1 }
        )
    }
}

# Confirm challan (POST)
if ($draftChallan3) {
    $draftId3 = $draftChallan3.id
    Test-API -Method "POST" -Url "/challans/$draftId3/confirm" -Token $adminToken -Name "Confirm Challan (POST)"
}

# Cancel challan (PATCH)
if ($draftChallan3) {
    $draftId3 = $draftChallan3.id
    Test-API -Method "PATCH" -Url "/challans/$draftId3/cancel" -Token $adminToken -Name "Cancel Challan (PATCH)"
}

# Create confirmed challan directly
if ($customerId -and $prodForChallan) {
    Test-API -Method "POST" -Url "/challans" -Token $adminToken -Name "Create Challan (Confirmed directly)" -Body @{
        customer_id = $customerId
        status = "Confirmed"
        items = @(
            @{ product_id = $prodForChallan; quantity = 1 }
        )
    }
}

# Filter challans by status
Test-API -Method "GET" -Url "/challans?status=Draft" -Token $adminToken -Name "Filter Challans (Draft)"
Test-API -Method "GET" -Url "/challans?status=Confirmed" -Token $adminToken -Name "Filter Challans (Confirmed)"

Write-Host "`n========== RESULTS ==========" -ForegroundColor Cyan
Write-Host "  Passed: $pass" -ForegroundColor Green
Write-Host "  Failed: $($errors.Count)" -ForegroundColor $(if ($errors.Count -gt 0) { "Red" } else { "Green" })

if ($errors.Count -gt 0) {
    Write-Host "`n  Failed Tests:" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "    - $e" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Cyan
