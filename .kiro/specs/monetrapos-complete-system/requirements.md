# Requirements - MonetraPOS Complete System

**Feature Name**: MonetraPOS Complete System  
**Type**: SaaS Multi-Tenant POS System  
**Target Market**: FnB, Laundry, Retail, dan UMKM lainnya  
**Status**: In Planning  
**Created**: 28 Maret 2026

---

## 1. Business Context

### 1.1 Vision
MonetraPOS adalah platform SaaS yang menyediakan solusi Point of Sale (POS) lengkap untuk pelaku usaha UMKM di Indonesia, khususnya FnB, Laundry, dan Retail. Platform ini memungkinkan pemilik usaha untuk mengelola bisnis mereka dengan mudah melalui sistem berbasis cloud dengan subscription model.

### 1.2 Business Model
- **SaaS (Software as a Service)** dengan subscription bulanan/tahunan
- **Multi-tenant architecture** - satu platform untuk banyak bisnis
- **Tiered pricing** - paket Basic, Professional, Enterprise
- **Target customer**: UMKM dengan 1-50 cabang

### 1.3 Stakeholders
1. **MonetraPOS (Anda)** - Pemilik platform, kelola member & fitur
2. **Member (Pemilik Usaha)** - Subscribe & kelola bisnis mereka
3. **Karyawan Member** - Gunakan sistem untuk operasional (kasir, manager, dll)
4. **End Customer** - Pelanggan dari bisnis member

---

## 2. System Architecture Overview

### 2.1 Components
```
┌─────────────────────────────────────────────────────────────┐
│                     MonetraPOS Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Backend API (NestJS)                                     │
│     - Port 4404                                              │
│     - RESTful API + GraphQL (future)                         │
│     - MySQL Database                                         │
│     - JWT Authentication                                     │
│                                                               │
│  2. Company Admin (Next.js) - Port 4402                      │
│     - Untuk MonetraPOS (Anda)                                │
│     - Kelola member, subscription, fitur                     │
│                                                               │
│  3. Member Admin (Next.js) - Port 4403                       │
│     - Untuk pemilik usaha (member)                           │
│     - Kelola produk, karyawan, laporan, dll                  │
│                                                               │
│  4. Mobile POS (Flutter) - Future                            │
│     - Untuk kasir                                            │
│     - Transaksi, payment, receipt                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. User Roles & Permissions

### 3.1 Company Admin (MonetraPOS)
**Role**: Super Admin, Admin, Support

**Akses**:
- ✅ Kelola semua member (approve, suspend, delete)
- ✅ Kelola subscription plans & pricing
- ✅ Kelola fitur yang tersedia per plan
- ✅ Lihat analytics semua member
- ✅ Kelola billing & invoicing
- ✅ Support & troubleshooting
- ✅ System configuration

### 3.2 Member Admin (Pemilik Usaha)
**Role**: Owner, Admin, Manager, Accountant, Cashier

#### Owner
- ✅ Full access ke semua fitur
- ✅ Kelola subscription & billing
- ✅ Kelola cabang/toko
- ✅ Kelola user & permission
- ✅ Lihat semua laporan

#### Admin
- ✅ Kelola produk & inventory
- ✅ Kelola karyawan
- ✅ Kelola customer
- ✅ Lihat laporan
- ❌ Tidak bisa ubah subscription

#### Manager
- ✅ Kelola operasional toko
- ✅ Kelola shift karyawan
- ✅ Approve transaksi
- ✅ Lihat laporan toko
- ❌ Tidak bisa kelola produk global

#### Accountant
- ✅ Lihat semua laporan keuangan
- ✅ Export data
- ✅ Kelola expenses
- ❌ Tidak bisa transaksi

#### Cashier
- ✅ Proses transaksi POS
- ✅ Kelola customer
- ✅ Clock in/out
- ❌ Tidak bisa lihat laporan

### 3.3 Mobile POS User
**Role**: Cashier (via mobile)

**Akses**:
- ✅ Login dengan PIN/fingerprint
- ✅ Proses transaksi
- ✅ Scan barcode
- ✅ Multiple payment methods
- ✅ Print receipt
- ✅ Basic customer info

---

## 4. Registration & Payment Flow

### 4.1 Self-Service Registration Flow

**User Story**: Sebagai calon member, saya ingin register sendiri dan langsung bayar agar bisa langsung pakai sistem tanpa menunggu approval manual.

#### 4.1.1 Registration Process
```
Step 1: Landing Page
   ↓
Step 2: Choose Plan (Basic/Pro/Enterprise)
   ↓
Step 3: Fill Registration Form
   ↓
Step 4: Payment (Midtrans/Xendit)
   ↓
Step 5: Payment Verification
   ↓
Step 6: Account Auto-Activated
   ↓
Step 7: Welcome Email & Onboarding
```

**Acceptance Criteria**:
- [ ] Landing page dengan pricing comparison
- [ ] Member bisa pilih plan (Basic, Professional, Enterprise)
- [ ] Form registrasi lengkap:
  - Company information (name, business type, address, phone)
  - Owner information (name, email, phone)
  - Password & confirmation
  - Terms & conditions checkbox
- [ ] Preview order summary sebelum payment
- [ ] Redirect ke payment gateway (Midtrans/Xendit)
- [ ] Support multiple payment methods:
  - Credit/Debit Card
  - Bank Transfer
  - E-Wallet (GoPay, OVO, Dana, ShopeePay)
  - QRIS
- [ ] Webhook untuk payment notification
- [ ] Auto-activate account setelah payment sukses
- [ ] Send welcome email dengan login credentials
- [ ] Send invoice via email
- [ ] Redirect ke Member Admin dashboard setelah payment

#### 4.1.2 Payment Gateway Integration

**Midtrans Integration**:
- [ ] Snap payment (popup/redirect)
- [ ] Payment notification webhook
- [ ] Transaction status check
- [ ] Refund handling

**Xendit Integration**:
- [ ] Invoice creation
- [ ] Payment notification webhook
- [ ] Transaction status check
- [ ] Refund handling

**Payment Flow**:
```
1. Member pilih plan → Create pending subscription
2. Generate payment invoice
3. Redirect ke payment gateway
4. Member bayar
5. Payment gateway send webhook notification
6. Verify payment signature
7. Update subscription status → active
8. Activate member account
9. Send confirmation email
10. Log payment transaction
```

**Acceptance Criteria**:
- [ ] Support Midtrans & Xendit
- [ ] Secure webhook verification
- [ ] Handle payment success
- [ ] Handle payment pending
- [ ] Handle payment failed
- [ ] Handle payment expired
- [ ] Retry mechanism untuk failed webhook
- [ ] Payment reconciliation
- [ ] Generate invoice PDF

#### 4.1.3 Subscription Activation

**Acceptance Criteria**:
- [ ] Auto-activate setelah payment sukses
- [ ] Set subscription start date
- [ ] Set subscription end date based on duration:
  - 1 bulan → +30 hari
  - 3 bulan → +90 hari
  - 6 bulan → +180 hari
  - 1 tahun → +365 hari
- [ ] Enable features sesuai plan
- [ ] Set usage limits sesuai plan
- [ ] Create default store untuk member
- [ ] Send welcome email dengan:
  - Login URL
  - Username/email
  - Subscription details (plan, duration, expiry date)
  - Getting started guide
  - Support contact
- [ ] Trigger onboarding flow

---

### 4.3 Subscription Lifecycle & Renewal Management

**User Story**: Sebagai member, saya ingin subscription saya otomatis dikelola agar tidak tiba-tiba akun saya nonaktif tanpa pemberitahuan.

#### 4.3.1 Subscription Duration Options

**Pricing Example (VIP Plan)**:
```
Base Price: Rp 250,000/bulan

Duration Options:
┌─────────────┬──────────────┬─────────────┬──────────┐
│ Duration    │ Price        │ Discount    │ Total    │
├─────────────┼──────────────┼─────────────┼──────────┤
│ 1 Bulan     │ Rp 250,000   │ 0%          │ 250,000  │
│ 3 Bulan     │ Rp 750,000   │ 5%          │ 712,500  │
│ 6 Bulan     │ Rp 1,500,000 │ 10%         │ 1,350,000│
│ 1 Tahun     │ Rp 3,000,000 │ 20%         │ 2,400,000│
└─────────────┴──────────────┴─────────────┴──────────┘

Hemat:
- 3 bulan: Rp 37,500 (setara 0.15 bulan gratis)
- 6 bulan: Rp 150,000 (setara 0.6 bulan gratis)
- 1 tahun: Rp 600,000 (setara 2.4 bulan gratis)
```

**Acceptance Criteria**:
- [ ] Member bisa pilih duration saat subscribe:
  - 1 bulan (no discount)
  - 3 bulan (5% discount)
  - 6 bulan (10% discount)
  - 1 tahun (20% discount)
- [ ] Show discount calculation
- [ ] Show total savings
- [ ] Show price per month comparison
- [ ] Calculate exact expiry date
- [ ] Store subscription duration in database

#### 4.3.2 Subscription Status Lifecycle

**Status Flow**:
```
[Active] → [Expiring Soon] → [Expired] → [Suspended] → [Cancelled]
   ↓            ↓               ↓            ↓
[Renewed]    [Renewed]      [Renewed]    [Reactivated]
```

**Status Definitions**:

1. **Active** (status: `active`)
   - Subscription masih berlaku
   - Semua fitur available
   - Member bisa full access
   - Expiry date > today

2. **Expiring Soon** (status: `active`, flag: `expiring_soon`)
   - 7 hari sebelum expired
   - Semua fitur masih available
   - Show renewal reminder di dashboard
   - Send email/notification reminder

3. **Expired** (status: `expired`)
   - Subscription sudah lewat expiry date
   - Grace period 3 hari
   - Fitur masih bisa diakses (read-only)
   - Tidak bisa create/update data
   - Show renewal banner

4. **Suspended** (status: `suspended`)
   - Setelah grace period (3 hari setelah expired)
   - Akun otomatis suspended
   - Tidak bisa login ke Member Admin
   - Data tetap tersimpan
   - Bisa reactivate dengan bayar renewal

5. **Cancelled** (status: `cancelled`)
   - Member cancel subscription sendiri
   - Atau admin cancel dari Company Admin
   - Akun tidak bisa diakses
   - Data tetap tersimpan (30 hari)
   - Setelah 30 hari → soft delete

**Acceptance Criteria**:
- [ ] Auto-update status based on expiry date
- [ ] Cron job check subscription status daily
- [ ] Handle status transitions
- [ ] Log status changes
- [ ] Send notification on status change

#### 4.3.3 Renewal Notification System

**Notification Timeline**:
```
Day -7:  "Subscription akan berakhir dalam 7 hari"
Day -3:  "Subscription akan berakhir dalam 3 hari"
Day -1:  "Subscription akan berakhir besok"
Day 0:   "Subscription Anda telah berakhir - Grace period 3 hari"
Day +1:  "Grace period tersisa 2 hari"
Day +2:  "Grace period tersisa 1 hari"
Day +3:  "Akun Anda telah disuspend - Silakan perpanjang"
```

**Notification Channels**:
- [ ] Email notification
- [ ] In-app notification (banner di dashboard)
- [ ] WhatsApp notification (optional, jika member aktifkan)
- [ ] SMS notification (optional, jika member aktifkan)

**Notification Content**:
```
Subject: Subscription Anda akan berakhir dalam 7 hari

Halo [Member Name],

Subscription Anda untuk paket [Plan Name] akan berakhir pada:
📅 [Expiry Date]

Untuk melanjutkan menggunakan MonetraPOS tanpa gangguan, 
silakan perpanjang subscription Anda sekarang.

[Perpanjang Sekarang]

Pilihan durasi:
- 1 Bulan: Rp 250,000
- 3 Bulan: Rp 712,500 (Hemat 5%)
- 6 Bulan: Rp 1,350,000 (Hemat 10%)
- 1 Tahun: Rp 2,400,000 (Hemat 20%)

Terima kasih,
Tim MonetraPOS
```

**Acceptance Criteria**:
- [ ] Auto-send notification based on timeline
- [ ] Customizable notification template
- [ ] Track notification sent
- [ ] Prevent duplicate notifications
- [ ] Member bisa disable/enable notification per channel
- [ ] Notification history log

#### 4.3.4 Renewal Process (Member Admin)

**Renewal Flow**:
```
Step 1: Member lihat renewal reminder di dashboard
   ↓
Step 2: Click "Perpanjang Subscription"
   ↓
Step 3: Pilih duration (1/3/6/12 bulan)
   ↓
Step 4: Review order & discount
   ↓
Step 5: Redirect ke payment gateway
   ↓
Step 6: Payment verification
   ↓
Step 7: Subscription extended
   ↓
Step 8: Status kembali ke "Active"
```

**Acceptance Criteria**:
- [ ] Renewal banner di dashboard (jika expiring soon/expired)
- [ ] "Renew Subscription" button prominent
- [ ] Show current subscription details:
  - Current plan
  - Expiry date
  - Days remaining
  - Status
- [ ] Duration selection dengan discount info
- [ ] Order summary:
  - Current expiry date
  - New expiry date (after renewal)
  - Duration
  - Price
  - Discount
  - Total
- [ ] Payment gateway integration
- [ ] Auto-extend subscription setelah payment sukses
- [ ] Send confirmation email
- [ ] Update status ke "Active"
- [ ] Remove suspension (jika suspended)

**Example UI**:
```
┌─────────────────────────────────────────────────┐
│  ⚠️ Subscription Anda akan berakhir dalam 5 hari│
│                                                  │
│  Current Plan: VIP Plan                         │
│  Expiry Date: 5 April 2026                      │
│  Status: Active (Expiring Soon)                 │
│                                                  │
│  [Perpanjang Sekarang]                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Pilih Durasi Perpanjangan                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  ○ 1 Bulan - Rp 250,000                         │
│                                                  │
│  ○ 3 Bulan - Rp 712,500 (Hemat 5%)             │
│     💰 Hemat Rp 37,500                          │
│                                                  │
│  ● 6 Bulan - Rp 1,350,000 (Hemat 10%)          │
│     💰 Hemat Rp 150,000 (Recommended)           │
│                                                  │
│  ○ 1 Tahun - Rp 2,400,000 (Hemat 20%)          │
│     💰 Hemat Rp 600,000 (Best Value!)           │
│                                                  │
│  ─────────────────────────────────────────────  │
│  Current Expiry: 5 April 2026                   │
│  New Expiry: 5 Oktober 2026 (+6 bulan)         │
│                                                  │
│  [Lanjut ke Pembayaran]                         │
└─────────────────────────────────────────────────┘
```

#### 4.3.5 Grace Period Management

**Grace Period Rules**:
- Duration: 3 hari setelah expiry
- Status: `expired` (belum `suspended`)
- Access: Read-only mode
- Features:
  - ✅ Bisa login
  - ✅ Bisa lihat data (products, transactions, reports)
  - ❌ Tidak bisa create/update/delete
  - ❌ Tidak bisa proses transaksi baru
  - ❌ Tidak bisa tambah produk/karyawan
  - ✅ Bisa perpanjang subscription

**Acceptance Criteria**:
- [ ] Auto-enable grace period setelah expired
- [ ] Show grace period banner:
  ```
  ⚠️ Subscription Anda telah berakhir
  Grace period: 2 hari tersisa
  Perpanjang sekarang untuk melanjutkan akses penuh
  [Perpanjang Sekarang]
  ```
- [ ] Restrict write operations
- [ ] Allow read operations
- [ ] Allow renewal process
- [ ] Count down grace period days
- [ ] Auto-suspend setelah grace period habis

#### 4.3.6 Auto-Suspension

**Suspension Rules**:
- Trigger: 3 hari setelah expired (grace period habis)
- Status: `suspended`
- Access: Tidak bisa login
- Data: Tetap tersimpan

**Suspension Flow**:
```
Day 0 (Expired):
- Status: expired
- Grace period: 3 hari
- Access: Read-only

Day +3 (Grace period habis):
- Status: suspended
- Access: Tidak bisa login
- Email: "Akun Anda telah disuspend"

Login Attempt:
- Show message: "Akun Anda suspended. Silakan perpanjang subscription."
- Show "Perpanjang" button
- Redirect ke renewal page
```

**Acceptance Criteria**:
- [ ] Auto-suspend setelah grace period
- [ ] Block login untuk suspended account
- [ ] Show suspension message di login page
- [ ] Provide renewal link di suspension message
- [ ] Send suspension notification email
- [ ] Log suspension event
- [ ] Data tetap tersimpan (tidak dihapus)

#### 4.3.7 Reactivation Process

**Reactivation Flow**:
```
Step 1: Member coba login (suspended account)
   ↓
Step 2: Show suspension message + renewal link
   ↓
Step 3: Click renewal link
   ↓
Step 4: Pilih duration & bayar
   ↓
Step 5: Payment verification
   ↓
Step 6: Auto-reactivate account
   ↓
Step 7: Status: active
   ↓
Step 8: Member bisa login kembali
```

**Acceptance Criteria**:
- [ ] Suspended member bisa reactivate dengan bayar renewal
- [ ] Calculate new expiry date from today (bukan dari old expiry)
- [ ] Restore full access
- [ ] Update status ke `active`
- [ ] Send reactivation confirmation email
- [ ] Log reactivation event
- [ ] All data tetap utuh (tidak hilang)

#### 4.3.8 Subscription History & Invoices

**Acceptance Criteria**:
- [ ] Member bisa lihat subscription history:
  - Subscription date
  - Plan
  - Duration
  - Amount paid
  - Payment method
  - Invoice number
  - Status
- [ ] Download invoice PDF
- [ ] Resend invoice via email
- [ ] Filter by date range
- [ ] Export to Excel/CSV

**Example History**:
```
┌──────────────────────────────────────────────────────────┐
│  Subscription History                                     │
├──────────────────────────────────────────────────────────┤
│  Date         Plan    Duration  Amount      Status       │
│  ──────────────────────────────────────────────────────  │
│  1 Jan 2026   VIP     6 bulan   Rp 1,350,000  Active    │
│  1 Jul 2025   VIP     6 bulan   Rp 1,350,000  Completed │
│  1 Jan 2025   VIP     6 bulan   Rp 1,350,000  Completed │
│  1 Oct 2024   Basic  3 bulan   Rp 270,000   Completed │
└──────────────────────────────────────────────────────────┘
```

#### 4.3.9 Auto-Renewal (Optional Feature)

**User Story**: Sebagai member, saya ingin auto-renewal agar tidak perlu manual perpanjang setiap bulan.

**Acceptance Criteria**:
- [ ] Member bisa enable/disable auto-renewal
- [ ] Auto-charge sebelum expiry (3 hari sebelum)
- [ ] Send notification sebelum auto-charge
- [ ] Handle payment failure:
  - Retry 3x (hari 1, 2, 3)
  - Send notification setiap retry
  - Jika gagal semua → suspend
- [ ] Member bisa cancel auto-renewal kapan saja
- [ ] Show auto-renewal status di dashboard

**Note**: Auto-renewal memerlukan:
- Saved payment method (credit card)
- Payment gateway support recurring payment
- PCI DSS compliance

---

### 4.2 Custom Features (Add-ons)

**User Story**: Sebagai member, saya ingin beli fitur tambahan (custom features) agar bisa customize sistem sesuai kebutuhan bisnis saya.

#### 4.2.1 Add-on Management (Company Admin)

**Acceptance Criteria**:
- [ ] CRUD custom features/add-ons
- [ ] Set pricing per add-on (one-time/recurring)
- [ ] Set description & benefits
- [ ] Set availability (all plans/specific plans)
- [ ] Enable/disable add-on
- [ ] Track add-on usage
- [ ] Add-on categories (Integration, Feature, Support)

**Example Add-ons**:
- Integration dengan accounting software (Rp 100k/bulan)
- WhatsApp notification (Rp 50k/bulan)
- Advanced analytics (Rp 150k/bulan)
- Multi-warehouse (Rp 200k/bulan)
- Custom report builder (Rp 100k/bulan)
- Priority support (Rp 300k/bulan)
- Additional stores (Rp 50k/store/bulan)
- Additional users (Rp 25k/user/bulan)

#### 4.2.2 Add-on Purchase Flow (Member Admin)

**Flow**:
```
Step 1: Member lihat available add-ons di settings
   ↓
Step 2: Member pilih add-on yang diinginkan
   ↓
Step 3: Preview pricing & benefits
   ↓
Step 4: Click "Purchase"
   ↓
Step 5: Redirect ke payment gateway
   ↓
Step 6: Payment verification
   ↓
Step 7: Add-on auto-activated
   ↓
Step 8: Feature available di Member Admin
```

**Acceptance Criteria**:
- [ ] Member bisa lihat list available add-ons
- [ ] Filter add-ons by category
- [ ] Show add-on details (description, price, benefits)
- [ ] Show "Purchased" badge untuk add-on yang sudah dibeli
- [ ] Show "Purchase" button untuk add-on yang belum dibeli
- [ ] Generate payment invoice untuk add-on
- [ ] Redirect ke payment gateway
- [ ] Auto-activate add-on setelah payment sukses
- [ ] Show activated add-on di dashboard
- [ ] Send confirmation email
- [ ] Add-on bisa di-cancel (stop renewal)

#### 4.2.3 Add-on Activation & Feature Toggle

**Acceptance Criteria**:
- [ ] Auto-enable feature setelah payment sukses
- [ ] Feature toggle di Member Admin
- [ ] Show "NEW" badge untuk newly activated features
- [ ] Onboarding guide untuk new feature
- [ ] Track feature usage
- [ ] Disable feature jika subscription expired
- [ ] Grace period (7 hari) sebelum disable

#### 4.2.4 Add-on Billing

**Acceptance Criteria**:
- [ ] One-time payment add-ons
- [ ] Recurring payment add-ons (monthly/yearly)
- [ ] Auto-renewal untuk recurring add-ons
- [ ] Payment reminder sebelum renewal
- [ ] Invoice generation
- [ ] Payment history
- [ ] Refund handling (pro-rated)

#### 4.2.5 Add-on Display in Member Admin

**Acceptance Criteria**:
- [ ] "Add-ons" menu di sidebar
- [ ] "Available Add-ons" tab
- [ ] "My Add-ons" tab (purchased add-ons)
- [ ] Add-on card dengan:
  - Icon/image
  - Name
  - Description
  - Price
  - Status (Available/Purchased/Active)
  - Purchase button
- [ ] Filter & search add-ons
- [ ] Sort by price, popularity, category

**Example UI**:
```
┌─────────────────────────────────────────────────┐
│  Add-ons                                        │
├─────────────────────────────────────────────────┤
│  [Available] [My Add-ons]                       │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ 📊 Analytics │  │ 💬 WhatsApp  │            │
│  │ Advanced     │  │ Notification │            │
│  │              │  │              │            │
│  │ Rp 150k/mo   │  │ Rp 50k/mo    │            │
│  │ [Purchase]   │  │ [✓ Active]   │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ 🏪 Multi     │  │ 📞 Priority  │            │
│  │ Warehouse    │  │ Support      │            │
│  │              │  │              │            │
│  │ Rp 200k/mo   │  │ Rp 300k/mo   │            │
│  │ [Purchase]   │  │ [Purchase]   │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
```

---

## 5. Core Features

### 5.1 Company Admin Features

#### 4.1.1 Member Management
**User Story**: Sebagai MonetraPOS admin, saya ingin mengelola member agar bisa kontrol siapa yang menggunakan platform.

**Acceptance Criteria**:
- [ ] Lihat list semua member dengan filter & search
- [ ] Approve/reject pendaftaran member baru
- [ ] Suspend/activate member account
- [ ] Lihat detail member (bisnis info, subscription, usage)
- [ ] Edit member information
- [ ] Delete member (soft delete)
- [ ] Lihat activity log member

#### 4.1.2 Subscription Management
**User Story**: Sebagai MonetraPOS admin, saya ingin mengelola subscription plans agar bisa kontrol pricing & fitur.

**Acceptance Criteria**:
- [ ] CRUD subscription plans (Basic, Pro, Enterprise)
- [ ] Set pricing per plan (monthly/yearly)
- [ ] Define features per plan
- [ ] Set limits per plan (stores, products, transactions)
- [ ] Promo codes & discounts
- [ ] Trial period management
- [ ] Upgrade/downgrade flow

#### 4.1.3 Feature Management
**User Story**: Sebagai MonetraPOS admin, saya ingin mengelola fitur yang tersedia agar bisa customize per plan.

**Acceptance Criteria**:
- [ ] CRUD features list
- [ ] Assign features to plans
- [ ] Feature flags (enable/disable)
- [ ] Feature usage tracking
- [ ] Feature limits per plan

#### 4.1.4 Billing & Invoicing
**User Story**: Sebagai MonetraPOS admin, saya ingin mengelola billing agar bisa track pembayaran member.

**Acceptance Criteria**:
- [ ] Generate invoice otomatis
- [ ] Track payment status
- [ ] Payment reminders
- [ ] Payment history
- [ ] Refund management
- [ ] Integration dengan payment gateway (Midtrans, Xendit)

#### 4.1.5 Analytics & Reporting
**User Story**: Sebagai MonetraPOS admin, saya ingin lihat analytics agar bisa monitor performa platform.

**Acceptance Criteria**:
- [ ] Dashboard overview (total member, revenue, active users)
- [ ] Member growth chart
- [ ] Revenue chart
- [ ] Popular features
- [ ] Usage statistics
- [ ] Churn rate
- [ ] Export reports

#### 4.1.6 Support & Troubleshooting
**User Story**: Sebagai MonetraPOS admin, saya ingin support member agar bisa bantu mereka.

**Acceptance Criteria**:
- [ ] Ticket system
- [ ] Live chat (future)
- [ ] Knowledge base
- [ ] FAQ management
- [ ] Member activity log
- [ ] System health monitoring

---

### 4.2 Member Admin Features

#### 4.2.1 Dashboard
**User Story**: Sebagai pemilik usaha, saya ingin lihat overview bisnis saya agar bisa monitor performa.

**Acceptance Criteria**:
- [ ] Sales today/week/month
- [ ] Top selling products
- [ ] Low stock alerts
- [ ] Pending orders
- [ ] Revenue chart
- [ ] Quick actions

#### 4.2.2 Store Management
**User Story**: Sebagai pemilik usaha, saya ingin kelola cabang/toko agar bisa manage multi-location.

**Acceptance Criteria**:
- [ ] CRUD stores/cabang
- [ ] Store information (name, address, phone, hours)
- [ ] Assign manager per store
- [ ] Store-specific inventory
- [ ] Store-specific reports
- [ ] Store status (active/inactive)

#### 4.2.3 Product Management
**User Story**: Sebagai pemilik usaha, saya ingin kelola produk agar bisa jual barang/jasa.

**Acceptance Criteria**:
- [ ] CRUD products
- [ ] Product categories
- [ ] Product variants (size, color, dll)
- [ ] Product images
- [ ] Pricing (base price, discount, tax)
- [ ] Stock management
- [ ] Barcode/SKU
- [ ] Product modifiers (untuk FnB: extra topping, dll)
- [ ] Bulk import/export

**Industry Specific**:
- **FnB**: Menu items, recipes, ingredients
- **Laundry**: Service types, pricing per kg/item
- **Retail**: Product catalog, variants

#### 4.2.4 Inventory Management
**User Story**: Sebagai pemilik usaha, saya ingin kelola inventory agar bisa track stok.

**Acceptance Criteria**:
- [ ] Real-time stock tracking
- [ ] Stock in/out
- [ ] Stock adjustment
- [ ] Low stock alerts
- [ ] Stock transfer antar cabang
- [ ] Stock opname
- [ ] Supplier management
- [ ] Purchase orders
- [ ] Stock history

#### 4.2.5 Employee Management
**User Story**: Sebagai pemilik usaha, saya ingin kelola karyawan agar bisa manage tim.

**Acceptance Criteria**:
- [ ] CRUD employees
- [ ] Employee roles & permissions
- [ ] Assign employee to store
- [ ] Employee schedule/shift
- [ ] Clock in/out tracking
- [ ] Attendance report
- [ ] Performance tracking
- [ ] Salary management (future)

#### 4.2.6 Customer Management
**User Story**: Sebagai pemilik usaha, saya ingin kelola customer agar bisa build loyalty.

**Acceptance Criteria**:
- [ ] Customer database
- [ ] Customer profile (name, phone, email, address)
- [ ] Purchase history
- [ ] Loyalty points
- [ ] Customer tiers (regular, silver, gold)
- [ ] Birthday/anniversary reminders
- [ ] Customer notes
- [ ] Bulk SMS/email (future)

#### 4.2.7 Transaction/POS
**User Story**: Sebagai kasir, saya ingin proses transaksi dengan cepat agar customer tidak menunggu lama.

**Acceptance Criteria**:
- [ ] Quick product search (barcode, name, SKU)
- [ ] Add to cart
- [ ] Apply discount (%, amount, promo code)
- [ ] Multiple payment methods (cash, card, e-wallet, split payment)
- [ ] Customer selection (optional)
- [ ] Order notes
- [ ] Print receipt
- [ ] Email receipt (optional)
- [ ] Void/refund transaction
- [ ] Hold/resume transaction
- [ ] Offline mode (future)

**Industry Specific**:
- **FnB**: Table management, order types (dine-in, takeaway, delivery), kitchen display
- **Laundry**: Order tracking, pickup/delivery schedule, item checklist

#### 4.2.8 Reporting & Analytics
**User Story**: Sebagai pemilik usaha, saya ingin lihat laporan agar bisa analisa bisnis.

**Acceptance Criteria**:
- [ ] Sales report (daily, weekly, monthly, custom)
- [ ] Product performance report
- [ ] Employee performance report
- [ ] Customer report
- [ ] Inventory report
- [ ] Profit/loss report
- [ ] Tax report
- [ ] Export to Excel/PDF
- [ ] Scheduled reports (email)

#### 4.2.9 Settings
**User Story**: Sebagai pemilik usaha, saya ingin customize settings agar sesuai bisnis saya.

**Acceptance Criteria**:
- [ ] Business profile
- [ ] Tax settings
- [ ] Receipt customization
- [ ] Payment methods
- [ ] Notification preferences
- [ ] Integration settings (payment gateway, accounting)
- [ ] Backup & restore

---

### 4.3 Mobile POS Features (Future - Flutter)

#### 4.3.1 Login & Authentication
**User Story**: Sebagai kasir, saya ingin login dengan mudah agar bisa mulai kerja cepat.

**Acceptance Criteria**:
- [ ] Login dengan email/password
- [ ] PIN login (4-6 digit)
- [ ] Fingerprint/Face ID
- [ ] Remember device
- [ ] Auto logout after idle

#### 4.3.2 POS Transaction
**User Story**: Sebagai kasir, saya ingin proses transaksi di mobile agar bisa mobile.

**Acceptance Criteria**:
- [ ] Product search & scan barcode
- [ ] Add to cart dengan quantity
- [ ] Apply discount
- [ ] Select customer
- [ ] Multiple payment methods
- [ ] Split payment
- [ ] Print receipt (Bluetooth printer)
- [ ] Email receipt
- [ ] Transaction history

#### 4.3.3 Offline Mode
**User Story**: Sebagai kasir, saya ingin tetap bisa transaksi saat offline agar tidak terganggu koneksi.

**Acceptance Criteria**:
- [ ] Sync data saat online
- [ ] Offline transaction queue
- [ ] Auto sync saat online kembali
- [ ] Conflict resolution

#### 4.3.4 Shift Management
**User Story**: Sebagai kasir, saya ingin clock in/out agar attendance tercatat.

**Acceptance Criteria**:
- [ ] Clock in/out
- [ ] Break time
- [ ] Shift summary
- [ ] Cash drawer management (opening/closing balance)

---

## 5. Industry-Specific Requirements

### 5.1 FnB (Food & Beverage)
- [ ] Table management (floor plan, table status)
- [ ] Order types (dine-in, takeaway, delivery)
- [ ] Kitchen display system (KDS)
- [ ] Recipe management
- [ ] Ingredient tracking
- [ ] Menu modifiers (extra cheese, no onion, dll)
- [ ] Split bill
- [ ] Tips management
- [ ] Integration dengan delivery apps (GoFood, GrabFood)

### 5.2 Laundry
- [ ] Service types (cuci kering, setrika, dry clean)
- [ ] Pricing per kg atau per item
- [ ] Order tracking (received, washing, drying, ready, delivered)
- [ ] Item checklist (baju, celana, dll)
- [ ] Pickup & delivery schedule
- [ ] Customer notification (SMS/WA)
- [ ] Barcode tagging per item

### 5.3 Retail
- [ ] Product variants (size, color, dll)
- [ ] Barcode scanning
- [ ] Supplier management
- [ ] Purchase orders
- [ ] Stock transfer
- [ ] Price tags printing

---

## 6. Technical Requirements

### 6.1 Performance
- [ ] Page load < 2 seconds
- [ ] API response < 500ms
- [ ] Support 1000+ concurrent users
- [ ] 99.9% uptime

### 6.2 Security
- [ ] JWT authentication
- [ ] Role-based access control (RBAC)
- [ ] Data encryption at rest & transit
- [ ] Regular security audits
- [ ] GDPR compliance (future)
- [ ] PCI DSS compliance untuk payment

### 6.3 Scalability
- [ ] Horizontal scaling
- [ ] Database sharding (future)
- [ ] CDN untuk static assets
- [ ] Caching (Redis)
- [ ] Load balancing

### 6.4 Integration
- [ ] Payment gateway (Midtrans, Xendit, Stripe)
- [ ] Accounting software (Jurnal, Accurate)
- [ ] Email service (SendGrid, Mailgun)
- [ ] SMS gateway
- [ ] WhatsApp Business API
- [ ] Delivery apps (GoFood, GrabFood)

---

## 7. Non-Functional Requirements

### 7.1 Usability
- [ ] Intuitive UI/UX
- [ ] Mobile responsive
- [ ] Multi-language (ID, EN)
- [ ] Dark mode (future)
- [ ] Accessibility (WCAG 2.1)

### 7.2 Reliability
- [ ] Automated backup daily
- [ ] Disaster recovery plan
- [ ] Error logging & monitoring
- [ ] Health checks

### 7.3 Maintainability
- [ ] Clean code architecture
- [ ] Comprehensive documentation
- [ ] Unit tests (80% coverage)
- [ ] Integration tests
- [ ] CI/CD pipeline

---

## 8. Success Metrics

### 8.1 Business Metrics
- [ ] 100 paying members dalam 6 bulan
- [ ] 1000 paying members dalam 1 tahun
- [ ] Monthly Recurring Revenue (MRR) $10,000 dalam 1 tahun
- [ ] Churn rate < 5%
- [ ] Customer satisfaction > 4.5/5

### 8.2 Technical Metrics
- [ ] 99.9% uptime
- [ ] API response time < 500ms
- [ ] Zero critical bugs in production
- [ ] Test coverage > 80%

---

## 9. Constraints & Assumptions

### 9.1 Constraints
- Budget terbatas untuk fase awal
- Tim kecil (1-3 developer)
- Timeline 6 bulan untuk MVP
- Mobile app (Flutter) di fase 2

### 9.2 Assumptions
- Target market sudah familiar dengan POS system
- Internet connection tersedia (offline mode future)
- Member punya device (laptop/tablet) untuk admin
- Kasir punya smartphone untuk mobile POS

---

## 10. Risks & Mitigation

### 10.1 Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Database performance issue | High | Medium | Implement caching, optimize queries |
| Security breach | Critical | Low | Regular security audits, penetration testing |
| Third-party API downtime | Medium | Medium | Implement fallback, queue system |
| Scalability issues | High | Medium | Design for scale from start, load testing |

### 10.2 Business Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low adoption rate | Critical | Medium | Marketing, free trial, referral program |
| High churn rate | High | Medium | Customer success team, onboarding |
| Competition | Medium | High | Unique features, better UX, local support |
| Payment gateway issues | High | Low | Multiple payment options |

---

## 11. Timeline & Phases

### Phase 1: MVP (Month 1-3)
**Focus**: Core POS functionality

**Company Admin**:
- [ ] Member management (basic)
- [ ] Subscription management (basic)
- [ ] Dashboard analytics

**Member Admin**:
- [ ] Product management
- [ ] Basic POS transaction
- [ ] Simple reporting
- [ ] Employee management (basic)

**Backend**:
- [ ] Authentication & authorization
- [ ] Core APIs
- [ ] Database setup

### Phase 2: Enhancement (Month 4-6)
**Focus**: Industry-specific features

**Member Admin**:
- [ ] Advanced inventory
- [ ] Customer loyalty
- [ ] Advanced reporting
- [ ] FnB specific features
- [ ] Laundry specific features

**Company Admin**:
- [ ] Advanced analytics
- [ ] Billing automation
- [ ] Support system

### Phase 3: Mobile & Integration (Month 7-9)
**Focus**: Mobile POS & integrations

- [ ] Flutter mobile app
- [ ] Offline mode
- [ ] Payment gateway integration
- [ ] Accounting integration
- [ ] Delivery app integration

### Phase 4: Scale & Optimize (Month 10-12)
**Focus**: Performance & scale

- [ ] Performance optimization
- [ ] Advanced features
- [ ] Multi-language
- [ ] Advanced analytics
- [ ] API for third-party

---

## 12. Open Questions

1. **Pricing Strategy**: Berapa harga per tier? Monthly atau yearly?
2. **Payment Gateway**: Midtrans, Xendit, atau keduanya?
3. **Deployment**: AWS, GCP, atau local server?
4. **Support**: Live chat, ticket system, atau keduanya?
5. **Marketing**: Strategi akuisisi member?
6. **Onboarding**: Bagaimana proses onboarding member baru?
7. **Training**: Apakah perlu training untuk member?
8. **Hardware**: Apakah jual hardware (printer, barcode scanner)?

---

## 13. Next Steps

1. **Review & Approve** requirements ini
2. **Prioritize** features untuk MVP
3. **Create Design Document** (database schema, API design, UI/UX)
4. **Create Tasks** untuk implementation
5. **Start Development** dengan prioritas tertinggi

---

**Document Status**: Draft  
**Last Updated**: 28 Maret 2026  
**Next Review**: Pending approval

