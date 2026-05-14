$base = "http://localhost:4404/api/v1"
$pass = 0; $fail = 0

function T($method, $url, $body, $token, $label) {
    try {
        $h = @{ "Content-Type" = "application/json" }
        if ($token) { $h["Authorization"] = "Bearer $token" }
        $p = @{ Uri=$url; Method=$method; Headers=$h; ErrorAction="Stop" }
        if ($body) { $p["Body"] = ($body | ConvertTo-Json -Depth 10) }
        $resp = Invoke-RestMethod @p
        $script:pass++; Write-Host "  PASS | $label"
        return $resp
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        try { $s = $_.Exception.Response.GetResponseStream(); $r = New-Object System.IO.StreamReader($s); $e = $r.ReadToEnd() } catch { $e = $_.Exception.Message }
        $script:fail++; Write-Host "  FAIL($code) | $label | $($e.Substring(0,[Math]::Min(100,$e.Length)))"
        return $null
    }
}

# Login
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body (@{email="usaha@warung.com";password="20041992"} | ConvertTo-Json) -ContentType "application/json"
$tok = $login.accessToken
Write-Host "Logged in as: $($login.user.email)"

$storesRes = Invoke-RestMethod -Uri "$base/stores" -Method GET -Headers @{Authorization="Bearer $tok"}
$stores = if ($storesRes.data) { $storesRes.data } else { $storesRes }
$storeId = $stores[0].id
Write-Host "Store: $($stores[0].name) ($storeId)"
$today = (Get-Date).ToString("yyyy-MM-dd")

Write-Host "`n[STORES]"
T "PATCH" "$base/stores/$storeId" @{name="Warung Makan Bu Sari"; type="restaurant"; phone="081234567890"; city="Jakarta"; address="Jl. Contoh No. 1"; receiptHeader="Warung Makan Bu Sari"; receiptFooter="Terima kasih atas kunjungan Anda!"} $tok "Update Store Name & Type" | Out-Null

Write-Host "`n[ROLES]"
$roles = T "GET" "$base/roles?storeId=$storeId" $null $tok "Get Roles"
Write-Host "  -> $($roles.Count) roles found"

Write-Host "`n[USERS]"
$users = T "GET" "$base/users" $null $tok "Get Users"

Write-Host "`n[EMPLOYEES]"
$emp = T "POST" "$base/employees" @{name="Siti Kasir"; phone="082111111111"; position="Kasir"; hireDate="2024-01-01"; salary=3000000; storeId=$storeId; password="kasir123"} $tok "Create Employee"
$empId = $emp?.id
T "GET" "$base/employees" $null $tok "Get Employees" | Out-Null

Write-Host "`n[PRODUCTS & CATEGORIES]"
$cat = T "POST" "$base/categories" @{name="Makanan"; slug="makanan-$(Get-Random -Max 999)"; storeId=$storeId} $tok "Create Category"
$catId = $cat?.id
T "GET" "$base/categories?companyId=$($login.user.companyId)&storeId=$storeId" $null $tok "Get Categories" | Out-Null
$prod = T "POST" "$base/products" @{name="Nasi Goreng Spesial"; price=25000; cost=15000; storeId=$storeId; type="physical"; stock=100; categoryId=$catId} $tok "Create Product"
$productId = $prod?.id
T "GET" "$base/products?storeId=$storeId" $null $tok "Get Products" | Out-Null

Write-Host "`n[CUSTOMERS]"
$cust = T "POST" "$base/customers" @{name="Budi Pelanggan"; phone="08$(Get-Random -Max 9999999999)"; storeId=$storeId} $tok "Create Customer"
$custId = $cust?.id
T "GET" "$base/customers" $null $tok "Get Customers" | Out-Null

Write-Host "`n[TAXES & DISCOUNTS]"
T "POST" "$base/taxes" @{name="PPN 11%"; type="percentage"; rate=11; storeId=$storeId; isActive=$true; isInclusive=$false} $tok "Create Tax" | Out-Null
T "GET" "$base/taxes?storeId=$storeId" $null $tok "Get Taxes" | Out-Null
T "POST" "$base/discounts" @{name="Diskon 10%"; type="percentage"; value=10; storeId=$storeId} $tok "Create Discount" | Out-Null
T "GET" "$base/discounts" $null $tok "Get Discounts" | Out-Null

Write-Host "`n[PAYMENT METHODS]"
T "GET" "$base/payment-methods" $null $tok "Get Payment Methods" | Out-Null

Write-Host "`n[SHIFTS & TRANSACTIONS]"
$shift = T "POST" "$base/shifts/open" @{storeId=$storeId; openingAmount=500000} $tok "Open Shift"
$shiftId = if ($shift) { $shift.id } else { $null }
$tx = T "POST" "$base/transactions" @{storeId=$storeId; shiftId=$shiftId; customerId=$custId; items=@(@{productId=$productId; productName="Nasi Goreng Spesial"; quantity=2; unitPrice=25000; subtotal=50000}); paymentMethod="cash"; paidAmount=60000; subtotal=50000; total=50000} $tok "Create Transaction"
$txId = if ($tx) { $tx.id } else { $null }
T "GET" "$base/transactions?storeId=$storeId" $null $tok "Get Transactions" | Out-Null
if ($txId) { T "POST" "$base/receipts/generate" @{transactionId=$txId; format="thermal"} $tok "Generate Receipt" | Out-Null } else { Write-Host "  SKIP | Generate Receipt" }
if ($shiftId) { T "PATCH" "$base/shifts/$shiftId/close" @{shiftId=$shiftId; closingCash=550000} $tok "Close Shift" | Out-Null } else { Write-Host "  SKIP | Close Shift" }
T "GET" "$base/shifts?storeId=$storeId" $null $tok "Get Shifts History" | Out-Null

Write-Host "`n[INVENTORY]"
T "GET" "$base/inventory?storeId=$storeId" $null $tok "Get Inventory" | Out-Null
if ($productId) { T "POST" "$base/inventory/movements" @{productId=$productId; storeId=$storeId; type="in"; quantity=50; reason="Restock"} $tok "Create Stock Movement" | Out-Null }
T "GET" "$base/inventory/low-stock?storeId=$storeId" $null $tok "Get Low Stock" | Out-Null

Write-Host "`n[STOCK OPNAME]"
T "GET" "$base/stock-opnames?storeId=$storeId" $null $tok "Get Stock Opname List" | Out-Null
# Get current inventory for opname items
$inv = Invoke-RestMethod -Uri "$base/inventory?storeId=$storeId" -Method GET -Headers @{Authorization="Bearer $tok"}
$invItems = @()
if ($inv.data) { $invItems = $inv.data } elseif ($inv -is [array]) { $invItems = $inv }
$opnameItems = @()
foreach ($item in $invItems) {
    if ($item.product -and $item.productId) {
        $opnameItems += @{
            product_id=$item.productId
            product_name=$item.product.name
            product_sku=$item.product.sku
            system_quantity=[int]$item.quantity
            physical_quantity=[int]$item.quantity
        }
    }
}
if ($opnameItems.Count -gt 0) {
    $opname = T "POST" "$base/stock-opnames" @{store_id=$storeId; opname_date=$today; notes="Test opname"; items=$opnameItems} $tok "Create Stock Opname"
    if ($opname -and $opname.id) { T "GET" "$base/stock-opnames/$($opname.id)" $null $tok "Get Stock Opname Detail" | Out-Null }
} else {
    Write-Host "  SKIP | Create Stock Opname (no inventory items)"
}

Write-Host "`n[SUPPLIERS & PURCHASE ORDERS]"
$sup = T "POST" "$base/suppliers" @{name="PT Supplier Makanan"; supplierCode="SUP$(Get-Random -Max 9999)"; phone="021111111"; email="supplier@test.com"; city="Jakarta"} $tok "Create Supplier"
$supId = $sup?.id
T "GET" "$base/suppliers" $null $tok "Get Suppliers" | Out-Null
if ($supId -and $productId) {
    $po = T "POST" "$base/purchase-orders" @{supplier_id=$supId; store_id=$storeId; order_date=$today; items=@(@{product_id=$productId; product_name="Nasi Goreng"; quantity_ordered=50; unit_price=12000; total_price=600000})} $tok "Create Purchase Order"
    T "GET" "$base/purchase-orders" $null $tok "Get Purchase Orders" | Out-Null
}

Write-Host "`n[FNB]"
T "GET" "$base/fnb/tables?storeId=$storeId" $null $tok "Get FnB Tables" | Out-Null
$rndTable = "T$(Get-Random -Max 999)"
$tbl = T "POST" "$base/fnb/tables" @{table_number=$rndTable; capacity=4; store_id=$storeId} $tok "Create FnB Table"
T "GET" "$base/fnb/modifiers/groups" $null $tok "Get FnB Modifier Groups" | Out-Null
T "GET" "$base/fnb/orders?storeId=$storeId" $null $tok "Get FnB Orders" | Out-Null

Write-Host "`n[LAUNDRY]"
T "GET" "$base/laundry/service-types" $null $tok "Get Laundry Service Types" | Out-Null
T "GET" "$base/laundry/orders" $null $tok "Get Laundry Orders" | Out-Null

Write-Host "`n[REPORTS]"
T "GET" "$base/reports/dashboard?storeId=$storeId" $null $tok "Dashboard Report" | Out-Null
T "GET" "$base/reports/sales?storeId=$storeId&startDate=$today&endDate=$today&groupBy=day" $null $tok "Sales Report" | Out-Null
T "GET" "$base/reports/products?storeId=$storeId&startDate=$today&endDate=$today" $null $tok "Product Report" | Out-Null
T "GET" "$base/reports/inventory?storeId=$storeId" $null $tok "Inventory Report" | Out-Null

Write-Host "`n[NOTIFICATIONS]"
T "GET" "$base/notifications" $null $tok "Get Notifications" | Out-Null

Write-Host "`n[AUDIT LOGS]"
T "GET" "$base/audit/logs" $null $tok "Get Audit Logs" | Out-Null

Write-Host "`n[ADD-ONS]"
T "GET" "$base/add-ons" $null $tok "Get Add-ons" | Out-Null

Write-Host "`n[BILLING & SUBSCRIPTION]"
T "GET" "$base/billing/invoices" $null $tok "Get Invoices" | Out-Null
T "GET" "$base/subscriptions/current" $null $tok "Current Subscription" | Out-Null

Write-Host "`n[USAGE]"
T "GET" "$base/usage" $null $tok "Get Usage" | Out-Null

Write-Host "`n[SETTINGS]"
T "GET" "$base/companies/profile" $null $tok "Get Company Profile" | Out-Null
T "GET" "$base/companies/settings" $null $tok "Get Company Settings" | Out-Null

Write-Host ""
Write-Host "============================================================"
Write-Host "TOTAL: $($pass + $fail) | PASS: $pass | FAIL: $fail"
Write-Host "============================================================"
