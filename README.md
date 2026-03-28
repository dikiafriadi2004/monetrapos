# MonetRAPOS

Multi-tenant POS system dengan subscription management.

## Quick Start

### 1. Setup Database
```bash
# Create database
mysql -u root -e "CREATE DATABASE IF NOT EXISTS monetrapos"

# Run migrations
cd apps/api
npm install
npm run start:dev
```

### 2. Start Applications

#### Backend API (Port 4404)
```bash
cd apps/api
npm run start:dev
```

#### Company Admin (Port 4402)
```bash
cd apps/company-admin
npm install
npm run dev
```

#### Member Admin (Port 4403)
```bash
cd apps/member-admin
npm install
npm run dev
```

## Access

- **Backend API**: http://localhost:4404
- **API Docs**: http://localhost:4404/api/docs
- **Company Admin**: http://localhost:4402
- **Member Admin**: http://localhost:4403

## Default Login

```
Email: admin@monetrapos.com
Password: admin123
```

## Tech Stack

- **Backend**: NestJS + TypeScript + MySQL + TypeORM
- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Auth**: JWT (Access + Refresh Token)

## Project Structure

```
monetrapos/
├── apps/
│   ├── api/              # Backend NestJS
│   ├── company-admin/    # Company Admin (Next.js)
│   └── member-admin/     # Member Admin (Next.js)
└── package.json
```

## Environment Setup

### Backend (.env)
```env
NODE_ENV=development
PORT=4404

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=monetrapos

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4404/api/v1
```

## License

Proprietary - MonetRAPOS © 2026
