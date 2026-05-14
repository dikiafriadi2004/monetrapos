# 🔔 Setup Webhook Xendit - Real-time Payment Activation

**Status:** ✅ Webhook endpoint sudah siap  
**URL:** `http://151.242.116.114:4404/api/v1/payment-gateway/webhook/xendit`  
**Token:** `sYiQSshlfgwBTKsOn8B79Kshy52tw9DApTCiXubcTOPeINph`

---

## 📋 Langkah Setup di Xendit Dashboard

### 1. Login ke Xendit Dashboard
- URL: https://dashboard.xendit.co/
- Gunakan akun Xendit Anda

### 2. Buka Settings → Webhooks
- Klik menu **Settings** (ikon gear)
- Pilih **Webhooks**

### 3. Add New Webhook
- Klik tombol **+ Add Webhook**

### 4. Isi Detail Webhook

**Webhook URL:**
```
http://151.242.116.114:4404/api/v1/payment-gateway/webhook/xendit
```

**Webhook Token (Verification Token):**
```
sYiQSshlfgwBTKsOn8B79Kshy52tw9DApTCiXubcTOPeINph
```

**Events yang harus dicentang:**
- ✅ `invoice.paid` — Saat invoice dibayar
- ✅ `invoice.expired` — Saat invoice kadaluarsa
- ✅ `invoice.failed` — Saat pembayaran gagal

### 5. Save & Test
- Klik **Save**
- Klik **Test** untuk verifikasi
- Expected response: `{"success": true}`

---

## ✅ Verifikasi Webhook Berfungsi

### Test Manual:
```bash
curl -X POST http://151.242.116.114:4404/api/v1/payment-gateway/webhook/xendit \
  -H "Content-Type: application/json" \
  -H "x-callback-token: sYiQSshlfgwBTKsOn8B79Kshy52tw9DApTCiXubcTOPeINph" \
  -d '{
    "id": "test-001",
    "external_id": "INV-TEST",
    "status": "PENDING",
    "amount": 100000
  }'
```

**Expected:** `{"success":true,"message":"Webhook processed successfully"}`

---

## 🔄 Flow Setelah Webhook Setup

```
User bayar di Xendit
    ↓
Xendit kirim webhook ke server
    ↓ (< 1 detik)
Server terima webhook
    ↓
Verifikasi token
    ↓
Update invoice status → paid
    ↓
Aktivasi subscription → active
    ↓
Aktivasi company → active
    ↓
User bisa login (< 1 menit total)
```

---

## 📊 Status Saat Ini

| Komponen | Status |
|----------|--------|
| Webhook endpoint | ✅ Ready |
| Token verification | ✅ Ready |
| Auto-activation | ✅ Ready |
| Backup auto-check (10 menit) | ✅ Ready |

**Setelah setup webhook di Xendit Dashboard, sistem akan 100% otomatis!**
