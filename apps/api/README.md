# MonetRAPOS API

Backend API untuk MonetRAPOS - Multi-Business POS Application

## 🚀 Tech Stack

- **Framework:** NestJS 11
- **Database:** MySQL 3.12 + TypeORM
- **Authentication:** JWT + Passport
- **Validation:** class-validator + class-transformer
- **Documentation:** Swagger/OpenAPI
- **Language:** TypeScript 5.7

## 📋 Prerequisites

- Node.js >= 20.0.0
- MySQL >= 8.0
- npm atau yarn

## 🔧 Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
```

## 🗄️ Database Setup

```bash
# Create database
mysql -u root -p
CREATE DATABASE monetrapos;

# Run migrations (auto-sync in development)
npm run start:dev
```

## 🏃 Running the App

```bash
# Development
npm run dev

# Watch mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 📚 API Documentation

Setelah aplikasi berjalan, akses Swagger documentation di:
```
http://localhost:3003/api/docs
```

## 🔑 Environment Variables

Lihat `.env.example` untuk daftar lengkap environment variables yang diperlukan.

### Required Variables:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`

### Optional Variables:
- `SENDGRID_API_KEY` - Untuk email notifications
- `TWILIO_*` - Untuk SMS notifications
- `MIDTRANS_*` - Untuk payment gateway

## 📦 Modules

### Core Modules
- **Auth** - Authentication & Authorization (JWT, RBAC)
- **Companies** - Company management
- **Members** - Business owner management
- **Stores** - Store management
- **Employees** - Employee management
- **Roles** - Role & permission management

### Business Modules
- **Products** - Product, category, variant management
- **Transactions** - POS transactions with auto stock deduction
- **Payments** - Payment methods & processing
- **Inventory** - Stock movement tracking
- **Customers** - Customer management with loyalty points
- **Discounts** - Discount & voucher management
- **Taxes** - Tax configuration

### Operational Modules
- **Shifts** - Cashier shift management with reconciliation
- **Receipts** - Receipt generation (thermal, A4, email)
- **Notifications** - Email, SMS, WhatsApp notifications
- **Audit** - Activity logging
- **Subscriptions** - Subscription plan management
- **Features** - Feature marketplace

### System Modules
- **Health** - Health check endpoints

## 🎯 Key Features

### 1. Multi-Tenant Architecture
- Company → Members → Stores hierarchy
- Data isolation per store
- Subscription-based features

### 2. Shift Management
- Cash declaration by denomination
- Multi-payment method reconciliation
- Variance tracking
- Detailed shift reports

### 3. Customer Loyalty
- Point accumulation (1 point per Rp 10.000)
- Point redemption (100 points = Rp 10.000)
- Transaction-based tracking

### 4. Stock Management
- Automatic stock deduction on transaction
- Atomic database transactions
- Stock movement tracking
- Low stock alerts

### 5. Receipt System
- Thermal receipt (58mm/80mm)
- A4 receipt (HTML for PDF)
- Email receipt
- Print receipt

## 🔐 Authentication

### User Types
1. **Company Admin** - Company owner
2. **Member** - Business owner/manager
3. **Employee** - Store staff

### Endpoints
```
POST /api/v1/auth/company/register
POST /api/v1/auth/company/login
POST /api/v1/auth/member/login
POST /api/v1/auth/employee/login
POST /api/v1/auth/refresh
```

### Authorization
- JWT Bearer token
- Role-Based Access Control (RBAC)
- Permission-based guards

## 📊 API Endpoints

### Main Endpoints
- `/api/v1/auth` - Authentication
- `/api/v1/companies` - Company management
- `/api/v1/members` - Member management
- `/api/v1/stores` - Store management
- `/api/v1/products` - Product management
- `/api/v1/transactions` - Transaction management
- `/api/v1/shifts` - Shift management
- `/api/v1/customers` - Customer management
- `/api/v1/receipts` - Receipt generation
- `/api/v1/notifications` - Notifications
- `/api/v1/health` - Health check

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🏗️ Project Structure

```
apps/api/
├── src/
│   ├── common/              # Shared utilities
│   │   ├── entities/        # Base entities
│   │   ├── enums/           # Enums
│   │   ├── filters/         # Exception filters
│   │   ├── interceptors/    # Interceptors
│   │   ├── middleware/      # Middleware
│   │   └── seeders/         # Database seeders
│   ├── config/              # Configuration
│   ├── health/              # Health check
│   ├── modules/             # Feature modules
│   │   ├── auth/
│   │   ├── companies/
│   │   ├── members/
│   │   ├── stores/
│   │   ├── products/
│   │   ├── transactions/
│   │   ├── shifts/
│   │   ├── customers/
│   │   ├── receipts/
│   │   └── ...
│   ├── app.module.ts
│   └── main.ts
├── test/
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

## 🚢 Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secrets
4. Configure CORS allowed origins
5. Setup SSL/TLS

### Docker (Optional)
```bash
# Build image
docker build -t monetrapos-api .

# Run container
docker run -p 3003:3003 monetrapos-api
```

## 📈 Performance

- Response time: <100ms (average)
- Database queries: Optimized with indexes
- Caching: Ready for Redis integration
- Rate limiting: Configurable

## 🔒 Security

- Input validation with class-validator
- SQL injection prevention (TypeORM)
- XSS protection
- CORS configuration
- JWT authentication
- Password hashing (bcrypt)
- Environment variable validation

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in .env
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3004
```

### Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## 📞 Support

- Documentation: `/api/docs`
- Issues: GitHub Issues
- Email: support@monetrapos.com

## 📄 License

Proprietary - MonetRAPOS

## 👥 Contributors

- Development Team

---

**Version:** 1.0.0  
**Last Updated:** 27 Maret 2026
