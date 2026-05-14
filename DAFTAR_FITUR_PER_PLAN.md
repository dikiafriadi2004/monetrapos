# 📋 Daftar Fitur Per Plan - MonetraPOS

**Status:** ✅ Sudah diimplementasi & ditest  
**Tanggal:** 16 April 2026

---

## 🎯 RINGKASAN PLAN

| Plan | Harga | Toko | User | Karyawan | Produk | Transaksi/bln |
|------|-------|------|------|----------|--------|---------------|
| **Trial** | Gratis 14 hari | 1 | 2 | 2 | 50 | 100 |
| **Starter** | Rp 299.000/bln | 1 | 5 | 10 | 100 | 1.000 |
| **Professional** | Rp 599.000/bln | 3 | 20 | 50 | 1.000 | 10.000 |
| **Enterprise** | Rp 1.499.000/bln | ∞ | ∞ | ∞ | ∞ | ∞ |

---

## 📊 FITUR PER PLAN (DETAIL)

| Fitur | Trial | Starter | Professional | Enterprise |
|-------|-------|---------|--------------|------------|
| **POS / Kasir** | ✅ | ✅ | ✅ | ✅ |
| **Manajemen Inventori** | ✅ | ✅ | ✅ | ✅ |
| **Laporan Dasar** | ✅ | ✅ | ✅ | ✅ |
| **Cetak Struk** | ✅ | ✅ | ✅ | ✅ |
| **Manajemen Pelanggan** | ❌ | ✅ | ✅ | ✅ |
| **Program Loyalitas** | ❌ | ✅ | ✅ | ✅ |
| **Manajemen Karyawan** | ❌ | ✅ | ✅ | ✅ |
| **Laporan Lanjutan** | ❌ | ❌ | ✅ | ✅ |
| **Multi-Toko** | ❌ | ❌ | ✅ (3 toko) | ✅ (∞) |
| **Kitchen Display (KDS)** | ❌ | ❌ | ✅ | ✅ |
| **Pemesanan Online** | ❌ | ❌ | ✅ | ✅ |
| **Akses API** | ❌ | ❌ | ✅ | ✅ |
| **Manajemen Pengiriman** | ❌ | ❌ | ❌ | ✅ |
| **Dukungan Prioritas** | ❌ | ❌ | ❌ | ✅ |
| **Manajer Dedikasi** | ❌ | ❌ | ❌ | ✅ |
| **White Label** | ❌ | ❌ | ❌ | ✅ |
| **Integrasi Kustom** | ❌ | ❌ | ❌ | ✅ |

---

## 🔒 ENFORCEMENT (API Level)

Semua batasan di-enforce di **backend middleware** (`SubscriptionAccessMiddleware`).  
Frontend tidak bisa bypass - setiap request dicek di server.

### Cara Kerja:

1. **Request masuk** ke API
2. **Middleware decode JWT** untuk ambil `companyId`
3. **Query subscription** + plan dari database
4. **Cek feature** yang dibutuhkan route tersebut
5. **Cek resource limit** (produk, transaksi, dll)
6. **Allow** atau **Block** dengan error 403

### Route → Feature Mapping:

| Route | Method | Feature Required | Blocked For |
|-------|--------|-----------------|-------------|
| `/customers` | POST/PUT/PATCH/DELETE | `customer_management` | Trial |
| `/customers/loyalty` | ALL | `customer_loyalty` | Trial |
| `/employees` | POST/PUT/PATCH/DELETE | `employee_management` | Trial |
| `/reports/advanced` | GET/POST | `advanced_reports` | Trial, Starter |
| `/stores` | POST | `multi_store` | Trial, Starter |
| `/kds`, `/fnb/kds` | ALL | `kds` | Trial, Starter |
| `/online-ordering` | ALL | `online_ordering` | Trial, Starter |
| `/add-ons`, `/integrations` | POST/PUT/PATCH/DELETE | `api_access` | Trial, Starter |
| `/delivery` | ALL | `delivery_management` | Trial, Starter, Professional |

### Resource Limit Enforcement:

| Resource | Limit Check | Error |
|----------|-------------|-------|
| Products | POST `/products` | `PLAN_LIMIT_REACHED` |
| Transactions | POST `/transactions` | `PLAN_LIMIT_REACHED` |
| Employees | POST `/employees` | `PLAN_LIMIT_REACHED` |
| Customers | POST `/customers` | `PLAN_LIMIT_REACHED` |
| Stores | POST `/stores` | `PLAN_LIMIT_REACHED` |

---

## 🧪 TEST RESULTS

### Trial Plan (Warung Makan Barokah):

```
✅ PASS: products GET allowed
✅ PASS: customers POST blocked (403)
✅ PASS: employees POST blocked (403)
✅ PASS: reports/advanced GET blocked (403)
✅ PASS: stores POST blocked (403)
✅ PASS: customers GET allowed (read-only)
```

### Error Response Format:

```json
{
  "statusCode": 403,
  "message": "Manajemen pelanggan tidak tersedia di paket Anda. Upgrade untuk mengakses fitur ini.",
  "error": "PLAN_FEATURE_BLOCKED",
  "feature": "customer_management",
  "currentPlan": "Trial",
  "upgradeUrl": "/upgrade"
}
```

---

## 🎯 UPGRADE PATH

```
Trial (Gratis 14 hari)
  ↓ Upgrade
Starter (Rp 299.000/bln)
  → Unlock: customer_management, customer_loyalty, employee_management
  ↓ Upgrade
Professional (Rp 599.000/bln)
  → Unlock: advanced_reports, multi_store (3 toko), kds, online_ordering, api_access
  ↓ Upgrade
Enterprise (Rp 1.499.000/bln)
  → Unlock: delivery_management, priority_support, dedicated_manager, white_label, custom_integrations
  → Semua limit: Unlimited
```

---

## 📱 FRONTEND ENFORCEMENT

Selain backend, frontend juga menampilkan:

1. **Lock icon** di sidebar untuk menu yang di-block
2. **Trial badge** di sidebar dengan countdown hari tersisa
3. **Trial banner** di atas dashboard dengan tombol Upgrade
4. **Upgrade page** (`/upgrade`) dengan perbandingan semua plan

---

## 🔧 CARA UPDATE FITUR PLAN

### Via Database:
```sql
UPDATE subscription_plans 
SET features = JSON_SET(features, '$.customer_management', true)
WHERE slug = 'starter';
```

### Via Seeder (untuk fresh install):
Edit `apps/api/src/modules/subscriptions/subscription-plans.service.ts`  
Method: `seedDefaultPlans()`

---

**Dibuat:** 16 April 2026  
**Status:** ✅ Production Ready  
**Tested:** All enforcement verified
