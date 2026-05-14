$base = "http://localhost:4404/api/v1"
$pass = 0; $fail = 0

function T($method, $url, $body, $token, $label) {
    try {
        $h = @{ "Content-Type" = "application/json" }
        if ($token) { $h["Authorization"] = "Bearer $token" }
        $p = @{ Uri=$url; Method=$method; Headers=$h; ErrorAction="Stop" }
        if ($body) { $p["Body"] = ($body | ConvertTo-Json -Depth 10) }
        $resp = Invoke-RestMethod @p
        return @{ ok=$true; data=$resp; label=$label }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errBody = $reader.ReadToEnd()
        } catch { $errBody = $_.Exception.Message }
        return @{ ok=$false; data=$null; label=$label; code=$code; err=$errBody }
    }
}

function Log($r) {
    if ($r.ok) { $script:pass++; Write-Host "  PASS | $($r.label)" }
    else { $script:fail++; Write-Host "  FAIL($($r.code)) | $($r.label) | $($r.err.Substring(0, [Math]::Min(120, $r.err.Length)))" }
}

function GetId($data) {
    if ($null -eq $data) { return $null }
    if ($data -is [array] -and $data.Count -gt 0) { return $data[0].id }
    if ($data.data -is [array] -and $data.data.Count -gt 0) { return $data.data[0].id }
    if ($data.id) { return $data.id }
    return $null
}

Write-Host "=== MONETRAPOS API TEST SUITE ==="

# ── AUTH ──────────────────────────────────────────────
Write-Host "`n[AUTH]"
$r = T "GET" "$base/health" $null $null "Health Check"; Log $r

$r = T "POST" "$base/admin/auth/login" @{email="admin@monetrapos.com"; password="admin123"} $null "Admin Login"; Log $r
$adminToken = $r.data.accessToken

$r = T "GET" "$base/subscription-plans" $null $null "Get Subscription Plans"; Log $r
$planId = $r.data[0].id

$email = "test$(Get-Random -Max 99999)@test.com"
$r = T "POST" "$base/auth/register" @{
    companyName="TestCo $(Get-Random -Max 999)"; companyEmail=$email
    ownerName="Owner Test"; ownerEmail=$email
    password="Test1234!"; phone="081234567890"; planId=$planId; durationMonths=1
} $null "Register Company"; Log $r
$companyId = $r.data.companyId; $subscriptionId = $r.data.subscriptionId

# Activate via DB
mysql -u root monetrapos -e "UPDATE subscriptions SET status='active', start_date=CURDATE(), end_date=DATE_ADD(CURDATE(), INTERVAL 1 MONTH) WHERE id='$subscriptionId'; UPDATE users SET email_verified=1 WHERE company_id='$companyId'; UPDATE companies SET status='active', subscription_status='active' WHERE id='$companyId';" 2>&1 | Out-Null

$r = T "POST" "$base/auth/login" @{email=$email; password="Test1234!"} $null "User Login"; Log $r
$userToken = $r.data.accessToken; $refreshToken = $r.data.refreshToken

$r = T "GET" "$base/auth/me" $null $userToken "Get Profile (auth/me)"; Log $r

$r = T "POST" "$base/auth/refresh" @{refreshToken=$refreshToken} $null "Refresh Token"; Log $r

# ── STORES ────────────────────────────────────────────
Write-Host "`n[STORES]"
$r = T "GET" "$base/stores" $null $userToken "Get Stores"; Log $r
$storeId = GetId $r.data

# If no store exists, create one first
if (-not $storeId) {
    $r2 = T "POST" "$base/stores" @{name="Toko Utama"; type="retail"; phone="021111111"; city="Jakarta"} $userToken "Create Initial Store"
    if ($r2.ok) { $storeId = $r2.data.id; $script:pass++; Write-Host "  PASS | Create Initial Store" }
    else { $script:fail++; Write-Host "  FAIL($($r2.code)) | Create Initial Store | $($r2.err)" }
}
Write-Host "    -> Store: $storeId"

$r = T "POST" "$base/stores" @{name="Toko Cabang 2"; type="retail"; phone="021222222"; city="Bandung"} $userToken "Create Store"; Log $r

# ── PRODUCTS & CATEGORIES ─────────────────────────────
Write-Host "`n[PRODUCTS]"
$slug = "makanan-$(Get-Random -Max 9999)"
# Categories route is /categories (not /products/categories)
$r = T "POST" "$base/categories" @{name="Makanan"; slug=$slug; storeId=$storeId} $userToken "Create Category"; Log $r
$categoryId = $r.data.id

$r = T "GET" "$base/categories?companyId=$companyId&storeId=$storeId" $null $userToken "Get Categories"; Log $r

$r = T "POST" "$base/products" @{
    name="Nasi Goreng Spesial"; price=25000; cost=15000
    storeId=$storeId; type="physical"; stock=100; categoryId=$categoryId
} $userToken "Create Product"; Log $r
$productId = $r.data.id

$r = T "GET" "$base/products?storeId=$storeId" $null $userToken "Get Products"; Log $r

$r = T "PATCH" "$base/products/$productId" @{price=27000; stock=150} $userToken "Update Product"; Log $r

# ── CUSTOMERS ─────────────────────────────────────────
Write-Host "`n[CUSTOMERS]"
$custPhone = "08$(Get-Random -Max 9999999999)"
$r = T "POST" "$base/customers" @{name="Budi Santoso"; phone=$custPhone; storeId=$storeId} $userToken "Create Customer"; Log $r
$customerId = $r.data.id

$r = T "GET" "$base/customers" $null $userToken "Get Customers"; Log $r

$r = T "GET" "$base/customers/$customerId" $null $userToken "Get Customer Detail"; Log $r

# ── TAXES & DISCOUNTS ─────────────────────────────────
Write-Host "`n[TAXES & DISCOUNTS]"
$r = T "POST" "$base/taxes" @{name="PPN 11%"; type="percentage"; rate=11; storeId=$storeId; isActive=$true; isInclusive=$false} $userToken "Create Tax"; Log $r
$taxId = $r.data.id

$r = T "GET" "$base/taxes?storeId=$storeId" $null $userToken "Get Taxes"; Log $r

$r = T "POST" "$base/discounts" @{name="Diskon 10%"; type="percentage"; value=10; storeId=$storeId} $userToken "Create Discount"; Log $r

$r = T "GET" "$base/discounts" $null $userToken "Get Discounts"; Log $r

# ── SHIFTS & TRANSACTIONS ─────────────────────────────
Write-Host "`n[SHIFTS & TRANSACTIONS]"
$r = T "POST" "$base/shifts/open" @{storeId=$storeId; openingAmount=500000} $userToken "Open Shift"; Log $r
$shiftId = $r.data.id

$r = T "GET" "$base/shifts/active?storeId=$storeId" $null $userToken "Get Active Shift"; Log $r

$r = T "POST" "$base/transactions" @{
    storeId=$storeId; shiftId=$shiftId; customerId=$customerId
    items=@(@{productId=$productId; productName="Nasi Goreng Spesial"; quantity=2; unitPrice=25000; subtotal=50000})
    paymentMethod="cash"; paidAmount=60000; subtotal=50000; total=50000
} $userToken "Create Transaction"; Log $r
$txId = $r.data.id

$r = T "GET" "$base/transactions?storeId=$storeId" $null $userToken "Get Transactions"; Log $r

$r = T "GET" "$base/transactions/$txId" $null $userToken "Get Transaction Detail"; Log $r

# Receipt - format must be thermal, a4, or email
$r = T "POST" "$base/receipts/generate" @{transactionId=$txId; format="thermal"} $userToken "Generate Receipt"; Log $r

$r = T "PATCH" "$base/shifts/$shiftId/close" @{shiftId=$shiftId; closingCash=550000} $userToken "Close Shift"; Log $r

$r = T "GET" "$base/shifts?storeId=$storeId" $null $userToken "Get Shifts History"; Log $r

# ── REPORTS ───────────────────────────────────────────
Write-Host "`n[REPORTS]"
$today = (Get-Date).ToString("yyyy-MM-dd")
$r = T "GET" "$base/reports/dashboard?storeId=$storeId&startDate=$today&endDate=$today" $null $userToken "Dashboard Report"; Log $r

$r = T "GET" "$base/reports/sales?storeId=$storeId&startDate=$today&endDate=$today&groupBy=day" $null $userToken "Sales Report"; Log $r

$r = T "GET" "$base/reports/products?storeId=$storeId&startDate=$today&endDate=$today" $null $userToken "Product Performance Report"; Log $r

$r = T "GET" "$base/reports/inventory?storeId=$storeId" $null $userToken "Inventory Report"; Log $r

# ── INVENTORY ─────────────────────────────────────────
Write-Host "`n[INVENTORY]"
$r = T "GET" "$base/inventory?storeId=$storeId" $null $userToken "Get Inventory"; Log $r

$r = T "POST" "$base/inventory/movements" @{
    productId=$productId; storeId=$storeId; type="in"; quantity=50; reason="Restock manual"
} $userToken "Create Stock Movement"; Log $r

$r = T "GET" "$base/inventory/movements?storeId=$storeId" $null $userToken "Get Stock Movements"; Log $r

$r = T "GET" "$base/inventory/low-stock?storeId=$storeId" $null $userToken "Get Low Stock"; Log $r

# ── EMPLOYEES ─────────────────────────────────────────
Write-Host "`n[EMPLOYEES]"
$r = T "POST" "$base/employees" @{
    name="Siti Rahayu"; phone="08$(Get-Random -Max 999999999)"; position="Kasir"
    hireDate="2024-01-01"; salary=3000000; storeId=$storeId
} $userToken "Create Employee"; Log $r
$employeeId = $r.data.id

$r = T "GET" "$base/employees" $null $userToken "Get Employees"; Log $r

# ── ROLES & PERMISSIONS ───────────────────────────────
Write-Host "`n[ROLES]"
$r = T "GET" "$base/roles" $null $userToken "Get Roles"; Log $r

$r = T "POST" "$base/roles" @{name="Supervisor"; storeId=$storeId; description="Store supervisor"} $userToken "Create Role"; Log $r
$roleId = $r.data.id

$r = T "GET" "$base/roles/permissions" $null $userToken "Get All Permissions"; Log $r

# ── PAYMENT METHODS ───────────────────────────────────
Write-Host "`n[PAYMENT METHODS]"
$r = T "GET" "$base/payment-methods" $null $userToken "Get Payment Methods"; Log $r

# ── SUPPLIERS & PURCHASE ORDERS ───────────────────────
Write-Host "`n[SUPPLIERS]"
$r = T "POST" "$base/suppliers" @{
    name="PT Supplier Test"; supplierCode="SUP$(Get-Random -Max 99999)"
    phone="021111111"; email="supplier@test.com"; city="Jakarta"
} $userToken "Create Supplier"; Log $r
$supplierId = $r.data.id

$r = T "GET" "$base/suppliers" $null $userToken "Get Suppliers"; Log $r

if ($supplierId -and $productId -and $storeId) {
    $r = T "POST" "$base/purchase-orders" @{
        supplier_id=$supplierId; store_id=$storeId; order_date=$today
        items=@(@{product_id=$productId; product_name="Nasi Goreng"; quantity_ordered=50; unit_price=12000; total_price=600000})
    } $userToken "Create Purchase Order"; Log $r
    $poId = $r.data.id
}

$r = T "GET" "$base/purchase-orders" $null $userToken "Get Purchase Orders"; Log $r

# ── FNB ───────────────────────────────────────────────
Write-Host "`n[FNB]"
$r = T "GET" "$base/fnb/tables?storeId=$storeId" $null $userToken "FnB Tables"; Log $r

$r = T "POST" "$base/fnb/tables" @{table_number="T01"; capacity=4; store_id=$storeId} $userToken "Create FnB Table"; Log $r

# FnB Modifier Groups - correct route is /fnb/modifiers/groups
$r = T "GET" "$base/fnb/modifiers/groups" $null $userToken "FnB Modifier Groups"; Log $r

# ── LAUNDRY ───────────────────────────────────────────
Write-Host "`n[LAUNDRY]"
$r = T "GET" "$base/laundry/orders" $null $userToken "Get Laundry Orders"; Log $r

$r = T "GET" "$base/laundry/service-types" $null $userToken "Get Laundry Service Types"; Log $r

# ── NOTIFICATIONS ─────────────────────────────────────
Write-Host "`n[NOTIFICATIONS]"
$r = T "GET" "$base/notifications" $null $userToken "Get Notifications"; Log $r

# ── AUDIT ─────────────────────────────────────────────
Write-Host "`n[AUDIT]"
$r = T "GET" "$base/audit/logs" $null $userToken "Get Audit Logs"; Log $r

$r = T "GET" "$base/audit/logs/recent" $null $userToken "Get Recent Audit Logs"; Log $r

# ── ADD-ONS ───────────────────────────────────────────
Write-Host "`n[ADD-ONS]"
$r = T "GET" "$base/add-ons" $null $userToken "Get Add-ons"; Log $r

# ── BILLING & SUBSCRIPTION ────────────────────────────
Write-Host "`n[BILLING]"
$r = T "GET" "$base/billing/invoices" $null $userToken "Get Invoices"; Log $r

$r = T "GET" "$base/subscriptions/current" $null $userToken "Current Subscription"; Log $r

$r = T "GET" "$base/subscriptions/history" $null $userToken "Subscription History"; Log $r

# ── USAGE ─────────────────────────────────────────────
Write-Host "`n[USAGE]"
$r = T "GET" "$base/usage" $null $userToken "Get Usage Summary"; Log $r

# ── LANDING ───────────────────────────────────────────
Write-Host "`n[LANDING]"
$r = T "GET" "$base/landing" $null $null "Landing Page"; Log $r

# ── ADMIN ─────────────────────────────────────────────
Write-Host "`n[ADMIN]"
$r = T "GET" "$base/admin/companies" $null $adminToken "Admin Companies"; Log $r

$r = T "GET" "$base/admin/features" $null $adminToken "Admin Features"; Log $r

$r = T "GET" "$base/admin/add-ons" $null $adminToken "Admin Add-ons"; Log $r

$r = T "GET" "$base/admin/audit/logs" $null $adminToken "Admin Audit Logs"; Log $r

# Admin subscription plans - correct route is /subscription-plans (admin uses same endpoint)
$r = T "GET" "$base/subscription-plans" $null $adminToken "Admin Subscription Plans"; Log $r

$r = T "GET" "$base/admin/settings/users" $null $adminToken "Admin Settings Users"; Log $r

$r = T "GET" "$base/admin/dashboard/stats" $null $adminToken "Admin Dashboard Stats"; Log $r

Write-Host ""
Write-Host "============================================================"
Write-Host "TOTAL: $($pass + $fail) | PASS: $pass | FAIL: $fail"
Write-Host "============================================================"
