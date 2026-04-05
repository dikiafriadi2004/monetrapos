# MonetraPOS

SaaS Point of Sale platform untuk UMKM Indonesia — FnB, Laundry, dan Retail.

## Struktur Project

```
MonetraPOS/
├── apps/
│   ├── api/              # Backend NestJS (Port 4404)
│   ├── member-admin/     # Member Admin Next.js (Port 4403)
│   └── company-admin/    # Company Admin Next.js (Port 4402)
├── docker-compose.yml        # Production
├── docker-compose.dev.yml    # Development (infra only)
└── .github/workflows/        # CI/CD pipelines
```

## Quick Start (Development)

### 1. Jalankan infrastruktur (MySQL + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Setup API

```bash
cd apps/api
cp .env.example .env
# Edit .env sesuai kebutuhan
npm install
npm run migration:run
npm run seed:all
npm run dev
```

### 3. Setup Member Admin

```bash
cd apps/member-admin
npm install
npm run dev
```

### 4. Setup Company Admin

```bash
cd apps/company-admin
npm install
npm run dev
```

## URLs

| Service | URL |
|---------|-----|
| API | http://localhost:4404 |
| API Docs (Swagger) | http://localhost:4404/api/docs |
| Member Admin | http://localhost:4403 |
| Company Admin | http://localhost:4402 |
| phpMyAdmin | http://localhost:8080 |

## Tech Stack

- **Backend**: NestJS, TypeORM, MySQL, Redis, Bull
- **Frontend**: Next.js 14, TypeScript
- **Auth**: JWT + Passport
- **Payment**: Midtrans, Xendit
- **Queue**: Bull (Redis)
- **Security**: Helmet, ThrottlerGuard

## Fitur Utama

- Multi-tenant SaaS dengan isolasi data per company
- Subscription management dengan Midtrans/Xendit
- POS transactions dengan inventory tracking
- FnB: Table management, KDS, Menu modifiers, Split bill
- Laundry: Order tracking, Item checklist, Service types
- Customer loyalty tiers (Regular/Silver/Gold/Platinum)
- Advanced reporting (Employee, Customer, P&L)
- Add-ons marketplace

## Environment Variables

Lihat `apps/api/.env.example` untuk daftar lengkap environment variables yang dibutuhkan.

## CI/CD

GitHub Actions workflows tersedia di `.github/workflows/`:
- `api.yml` — Test, build, deploy API
- `member-admin.yml` — Build, deploy Member Admin
- `company-admin.yml` — Build, deploy Company Admin

