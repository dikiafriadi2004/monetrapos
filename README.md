# MonetraPOS

SaaS Point of Sale platform untuk UMKM Indonesia — FnB, Laundry, dan Retail.

## Struktur Project

```
MonetraPOS/
+-- apps/
¦   +-- api/              # Backend NestJS (Port 4404)
¦   +-- member-admin/     # Member Admin Next.js (Port 4403)
¦   +-- company-admin/    # Company Admin Next.js (Port 4402)
¦   +-- mobile/           # Mobile app
+-- ecosystem.config.js       # PM2 process manager config
+-- start-all.ps1             # Script untuk start semua services
+-- docker-compose.yml        # Production Docker
+-- docker-compose.dev.yml    # Development (infra only)
```

## URLs (Production)

| Service | URL |
|---------|-----|
| API | http://151.242.116.114:4404 |
| API Docs (Swagger) | http://151.242.116.114:4404/api/docs |
| Member Admin | http://151.242.116.114:4403 |
| Company Admin | http://151.242.116.114:4402 |

## Start Services

### Production (PM2)

```powershell
# Start semua services
powershell -ExecutionPolicy Bypass -File start-all.ps1

# Atau manual:
pm2 start ecosystem.config.js
node apps/api/dist/src/main.js  # API
```

### Development

```bash
# API
cd apps/api && npm run start:dev

# Member Admin
cd apps/member-admin && npm run dev

# Company Admin
cd apps/company-admin && npm run dev
```

## Build Production

```bash
# Build semua
cd apps/api && npm run build
cd apps/member-admin && npm run build
cd apps/company-admin && npm run build
```

## Subscription Plans

| Plan | Harga | Produk | Transaksi/bln | Fitur |
|------|-------|--------|---------------|-------|
| **Trial** | Gratis 14 hari | 50 | 100 | POS, Inventori, Laporan Dasar |
| **Starter** | Rp 299.000/bln | 100 | 1.000 | + Pelanggan, Karyawan, Loyalitas |
| **Professional** | Rp 599.000/bln | 1.000 | 10.000 | + Laporan Lanjutan, Multi-Toko, KDS |
| **Enterprise** | Rp 1.499.000/bln | 8 | 8 | + Pengiriman, White Label, API |

Lihat detail: `DAFTAR_FITUR_PER_PLAN.md`

## Registration Flow

1. User buka `/register-trial` ? Isi form sederhana
2. Auto login langsung (tanpa verifikasi email)
3. Trial 14 hari aktif dengan fitur terbatas
4. Upgrade via `/upgrade` untuk unlock semua fitur

## Payment (Xendit)

Webhook URL: `http://151.242.116.114:4404/api/v1/payment-gateway/webhook/xendit`

Setup: Lihat `SETUP_WEBHOOK_XENDIT.md`

## Auto-Check Pending Payments

```bash
cd apps/api
npm run check-payments
```

## Tech Stack

- **Backend**: NestJS, TypeORM, MySQL, Redis, Bull
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Auth**: JWT + Passport
- **Payment**: Xendit
- **Queue**: Bull (Redis)
- **Process Manager**: PM2

## Environment Variables

Lihat `apps/api/.env.example` untuk daftar lengkap.
