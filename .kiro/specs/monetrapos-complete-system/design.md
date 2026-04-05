# Design Document - MonetraPOS Complete System

**Feature Name**: MonetraPOS Complete System  
**Type**: SaaS Multi-Tenant POS System  
**Status**: In Design  
**Created**: 28 Maret 2026

---

## Overview

MonetraPOS is a comprehensive SaaS-based Point of Sale system designed for Indonesian SMEs in the FnB, Laundry, and Retail sectors. The system follows a multi-tenant architecture where a single platform serves multiple businesses (members), each with their own isolated data and configurations.

### Key Design Principles

1. **Multi-Tenancy**: Complete data isolation between members using tenant-scoped queries
2. **Subscription-Based**: Flexible subscription model with duration-based pricing and add-ons
3. **Payment Integration**: Seamless integration with Indonesian payment gateways (Midtrans, Xendit)
4. **Industry Flexibility**: Core POS features with industry-specific extensions
5. **Scalability**: Designed to handle 1000+ concurrent users with horizontal scaling
6. **Security**: JWT-based authentication with role-based access control (RBAC)

### System Components

- **Backend API (NestJS)**: Port 4404, MySQL database, Redis cache, Bull queue, JWT authentication
- **Company Admin (Next.js)**: Port 4402, for MonetraPOS administrators
- **Member Admin (Next.js)**: Port 4403, for business owners and staff
- **Mobile POS (Flutter)**: Future phase, for cashiers and mobile transactions

---

## Architecture

### Multi-Tenant Architecture

**Tenant Isolation Strategy**:
- Every table (except system tables) has a `company_id` column
- Tenant middleware extracts `company_id` from JWT token
- All queries automatically scoped to current tenant
- No cross-tenant data access possible

### Authentication Flow

1. User submits login credentials (email, password)
2. API verifies credentials and checks subscription status
3. Generate JWT token with {userId, companyId, role, permissions}
4. All subsequent requests include JWT in Authorization header
5. Middleware validates token and extracts tenant context
6. Queries automatically scoped to company_id

### Registration & Payment Flow

1. User selects plan and duration on landing page
2. Fills registration form (company info, owner info, password)
3. System creates pending company, user, and subscription
4. Generates invoice and redirects to payment gateway
5. User completes payment (card, bank transfer, e-wallet, QRIS)
6. Payment gateway sends webhook notification
7. System verifies payment, activates subscription and account
8. Sends welcome email with credentials and invoice
9. User redirected to Member Admin dashboard


### Subscription Lifecycle

**Status Flow**: Pending → Active → Expiring Soon → Expired → Suspended → Cancelled

**Status Definitions**:
- **Pending**: Awaiting payment after registration
- **Active**: Subscription valid, full access (expiry_date > today)
- **Expiring Soon**: 7 days before expiry, show renewal reminders
- **Expired**: Past expiry date, 3-day grace period, read-only access
- **Suspended**: After grace period, no login access, data preserved
- **Cancelled**: Manual cancellation, data kept for 30 days then soft deleted

**Grace Period Rules** (3 days after expiry):
- Status: expired (not yet suspended)
- Access: Read-only mode (can view data, cannot create/update/delete)
- Can renew subscription to restore full access
- After 3 days: auto-suspend account

**Renewal Process**:
- Member sees renewal banner in dashboard
- Selects duration (1/3/6/12 months with 0%/5%/10%/20% discounts)
- Reviews order summary showing current and new expiry dates
- Completes payment via gateway
- Subscription extended, status returns to Active
- If suspended: account reactivated with new expiry from today

**Notification Timeline**:
- Day -7: "Subscription expires in 7 days"
- Day -3: "Subscription expires in 3 days"
- Day -1: "Subscription expires tomorrow"
- Day 0: "Subscription expired - 3 day grace period"
- Day +1, +2: Grace period countdown
- Day +3: "Account suspended - Please renew"


### Add-on Purchase Flow

1. Member views available add-ons in settings
2. Selects desired add-on (e.g., WhatsApp notifications, advanced analytics)
3. Reviews pricing (one-time or recurring monthly)
4. Clicks "Purchase" and redirects to payment gateway
5. Completes payment
6. Add-on auto-activated and feature enabled
7. Receives confirmation email
8. Feature appears in Member Admin interface

---

## Components and Interfaces

### Core Services

**AuthService**:
- `register(dto: RegisterDto)`: Create company, user, subscription
- `login(email, password)`: Authenticate and return JWT
- `verifyEmail(token)`: Verify email address
- `forgotPassword(email)`: Send reset token
- `resetPassword(token, newPassword)`: Reset password
- `refreshToken(refreshToken)`: Get new access token

**SubscriptionService**:
- `createSubscription(companyId, planId, duration)`: Create new subscription
- `renewSubscription(subscriptionId, duration)`: Extend subscription
- `checkStatus()`: Check and update subscription statuses (cron job)
- `suspend(subscriptionId)`: Suspend expired subscription
- `reactivate(subscriptionId, duration)`: Reactivate suspended subscription
- `cancel(subscriptionId)`: Cancel subscription

**PaymentService**:
- `createInvoice(subscriptionId, amount)`: Generate invoice
- `processPayment(invoiceId, gateway)`: Initiate payment
- `handleWebhook(gateway, payload)`: Process payment notifications
- `verifySignature(gateway, payload, signature)`: Verify webhook authenticity
- `refund(transactionId, amount)`: Process refund


**NotificationService**:
- `sendRenewalReminder(subscriptionId, daysUntilExpiry)`: Send renewal notification
- `sendWelcomeEmail(userId)`: Send welcome email after registration
- `sendInvoice(invoiceId)`: Email invoice PDF
- `sendSuspensionNotice(companyId)`: Notify about suspension
- `queueNotification(type, recipient, data)`: Add to queue for async sending

**ProductService**:
- `create(dto: CreateProductDto)`: Create product
- `update(id, dto: UpdateProductDto)`: Update product
- `delete(id)`: Soft delete product
- `findAll(filters)`: List products with pagination
- `findById(id)`: Get product details
- `updateStock(id, quantity, type)`: Adjust stock levels

**TransactionService**:
- `createTransaction(dto: CreateTransactionDto)`: Process POS transaction
- `voidTransaction(id, reason)`: Void/cancel transaction
- `refundTransaction(id, amount)`: Process refund
- `getTransactionHistory(filters)`: List transactions
- `calculateTotal(items, discounts, taxes)`: Calculate transaction total

**InventoryService**:
- `adjustStock(productId, quantity, type, reason)`: Stock adjustment
- `transferStock(fromStoreId, toStoreId, items)`: Inter-store transfer
- `getLowStockAlerts()`: Get products below minimum stock
- `recordStockOpname(storeId, items)`: Record stock taking

**ReportService**:
- `getSalesReport(startDate, endDate, filters)`: Generate sales report
- `getProductPerformance(startDate, endDate)`: Product performance metrics
- `getEmployeePerformance(startDate, endDate)`: Employee metrics
- `getInventoryReport()`: Current inventory status
- `exportReport(reportType, format)`: Export to Excel/PDF


### API Endpoints

**Authentication & Registration**:
- `POST /api/auth/register` - Register new company with payment
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout and invalidate token
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

**Subscription Management**:
- `GET /api/subscriptions/current` - Get current subscription details
- `POST /api/subscriptions/renew` - Renew subscription
- `GET /api/subscriptions/history` - Get subscription history
- `GET /api/subscriptions/plans` - List available plans
- `POST /api/subscriptions/cancel` - Cancel subscription

**Payment & Billing**:
- `POST /api/payments/create` - Create payment for subscription/add-on
- `POST /api/payments/webhook/midtrans` - Midtrans webhook handler
- `POST /api/payments/webhook/xendit` - Xendit webhook handler
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice details
- `GET /api/invoices/:id/pdf` - Download invoice PDF

**Add-ons**:
- `GET /api/addons` - List available add-ons
- `GET /api/addons/purchased` - List purchased add-ons
- `POST /api/addons/:id/purchase` - Purchase add-on
- `POST /api/addons/:id/cancel` - Cancel add-on subscription


**Product Management**:
- `GET /api/products` - List products (paginated, filtered)
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product (soft)
- `POST /api/products/bulk-import` - Bulk import products
- `GET /api/products/export` - Export products to Excel

**Category Management**:
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

**Inventory Management**:
- `POST /api/inventory/adjust` - Adjust stock
- `POST /api/inventory/transfer` - Transfer stock between stores
- `GET /api/inventory/low-stock` - Get low stock alerts
- `POST /api/inventory/opname` - Record stock taking
- `GET /api/inventory/history` - Stock movement history

**Transaction/POS**:
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/transactions/:id/void` - Void transaction
- `POST /api/transactions/:id/refund` - Refund transaction
- `GET /api/transactions/:id/receipt` - Get receipt (print/email)

**Customer Management**:
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `POST /api/customers/:id/points/add` - Add loyalty points
- `POST /api/customers/:id/points/redeem` - Redeem points


**Employee Management**:
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `POST /api/employees/:id/clock-in` - Clock in
- `POST /api/employees/:id/clock-out` - Clock out
- `GET /api/employees/:id/attendance` - Get attendance history

**Store Management**:
- `GET /api/stores` - List stores
- `POST /api/stores` - Create store
- `GET /api/stores/:id` - Get store details
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

**Reports**:
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/products` - Product performance report
- `GET /api/reports/employees` - Employee performance report
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/customers` - Customer report
- `POST /api/reports/export` - Export report (Excel/PDF)

**Company Admin Endpoints**:
- `GET /api/admin/members` - List all members
- `GET /api/admin/members/:id` - Get member details
- `PUT /api/admin/members/:id/status` - Update member status
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/plans` - Manage subscription plans
- `POST /api/admin/plans` - Create plan
- `PUT /api/admin/plans/:id` - Update plan

---

## Data Models

### Database Schema

#### Core System Tables

**companies**
```sql
id: UUID PRIMARY KEY
name: VARCHAR(255) NOT NULL
business_type: ENUM('fnb', 'laundry', 'retail', 'other')
email: VARCHAR(255) UNIQUE NOT NULL
phone: VARCHAR(50)
address: TEXT
city: VARCHAR(100)
province: VARCHAR(100)
postal_code: VARCHAR(20)
tax_id: VARCHAR(50)
logo_url: VARCHAR(500)
status: ENUM('pending', 'active', 'suspended', 'cancelled') DEFAULT 'pending'
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at: TIMESTAMP NULL
```

**users**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
email: VARCHAR(255) UNIQUE NOT NULL
password_hash: VARCHAR(255) NOT NULL
full_name: VARCHAR(255) NOT NULL
phone: VARCHAR(50)
role: ENUM('super_admin', 'admin', 'owner', 'manager', 'accountant', 'cashier')
is_email_verified: BOOLEAN DEFAULT FALSE
is_active: BOOLEAN DEFAULT TRUE
last_login_at: TIMESTAMP NULL
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at: TIMESTAMP NULL
INDEX idx_company_id (company_id)
INDEX idx_email (email)
```


**roles**
```sql
id: UUID PRIMARY KEY
name: VARCHAR(100) NOT NULL
description: TEXT
is_system_role: BOOLEAN DEFAULT FALSE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**permissions**
```sql
id: UUID PRIMARY KEY
name: VARCHAR(100) NOT NULL UNIQUE
resource: VARCHAR(100) NOT NULL
action: ENUM('create', 'read', 'update', 'delete', 'manage')
description: TEXT
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_resource_action (resource, action)
```

**role_permissions**
```sql
id: UUID PRIMARY KEY
role_id: UUID FOREIGN KEY REFERENCES roles(id)
permission_id: UUID FOREIGN KEY REFERENCES permissions(id)
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY unique_role_permission (role_id, permission_id)
```

**user_roles**
```sql
id: UUID PRIMARY KEY
user_id: UUID FOREIGN KEY REFERENCES users(id)
role_id: UUID FOREIGN KEY REFERENCES roles(id)
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY unique_user_role (user_id, role_id)
```


#### Subscription Management Tables

**subscription_plans**
```sql
id: UUID PRIMARY KEY
name: VARCHAR(100) NOT NULL
slug: VARCHAR(100) UNIQUE NOT NULL
description: TEXT
base_price_monthly: DECIMAL(15,2) NOT NULL
features: JSON
limits: JSON (max_stores, max_products, max_users, max_transactions_per_month)
is_active: BOOLEAN DEFAULT TRUE
sort_order: INT DEFAULT 0
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**subscription_durations**
```sql
id: UUID PRIMARY KEY
plan_id: UUID FOREIGN KEY REFERENCES subscription_plans(id)
duration_months: INT NOT NULL (1, 3, 6, 12)
discount_percentage: DECIMAL(5,2) DEFAULT 0 (0, 5, 10, 20)
final_price: DECIMAL(15,2) NOT NULL
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
UNIQUE KEY unique_plan_duration (plan_id, duration_months)
```

**subscriptions**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
plan_id: UUID FOREIGN KEY REFERENCES subscription_plans(id)
duration_months: INT NOT NULL
status: ENUM('pending', 'active', 'expired', 'suspended', 'cancelled')
start_date: DATE NULL
end_date: DATE NULL
grace_period_end_date: DATE NULL
is_auto_renew: BOOLEAN DEFAULT FALSE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_company_status (company_id, status)
INDEX idx_end_date (end_date)
```


**subscription_history**
```sql
id: UUID PRIMARY KEY
subscription_id: UUID FOREIGN KEY REFERENCES subscriptions(id)
plan_id: UUID FOREIGN KEY REFERENCES subscription_plans(id)
duration_months: INT NOT NULL
amount_paid: DECIMAL(15,2) NOT NULL
start_date: DATE NOT NULL
end_date: DATE NOT NULL
status: ENUM('active', 'completed', 'cancelled')
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_subscription_id (subscription_id)
```

**add_ons**
```sql
id: UUID PRIMARY KEY
name: VARCHAR(255) NOT NULL
slug: VARCHAR(255) UNIQUE NOT NULL
description: TEXT
category: ENUM('integration', 'feature', 'support', 'capacity')
price_monthly: DECIMAL(15,2) NOT NULL
is_recurring: BOOLEAN DEFAULT TRUE
is_active: BOOLEAN DEFAULT TRUE
available_for_plans: JSON (array of plan_ids, null = all plans)
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**company_add_ons**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
add_on_id: UUID FOREIGN KEY REFERENCES add_ons(id)
status: ENUM('active', 'cancelled', 'expired')
start_date: DATE NOT NULL
end_date: DATE NULL
is_auto_renew: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
UNIQUE KEY unique_company_addon (company_id, add_on_id)
INDEX idx_company_status (company_id, status)
```


#### Payment & Billing Tables

**invoices**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
invoice_number: VARCHAR(50) UNIQUE NOT NULL
invoice_type: ENUM('subscription', 'add_on', 'renewal')
subscription_id: UUID NULL FOREIGN KEY REFERENCES subscriptions(id)
add_on_id: UUID NULL FOREIGN KEY REFERENCES company_add_ons(id)
subtotal: DECIMAL(15,2) NOT NULL
discount_amount: DECIMAL(15,2) DEFAULT 0
tax_amount: DECIMAL(15,2) DEFAULT 0
total_amount: DECIMAL(15,2) NOT NULL
status: ENUM('pending', 'paid', 'failed', 'expired', 'refunded')
due_date: DATE NOT NULL
paid_at: TIMESTAMP NULL
invoice_pdf_url: VARCHAR(500) NULL
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_company_status (company_id, status)
INDEX idx_invoice_number (invoice_number)
```

**payment_transactions**
```sql
id: UUID PRIMARY KEY
invoice_id: UUID FOREIGN KEY REFERENCES invoices(id)
company_id: UUID FOREIGN KEY REFERENCES companies(id)
payment_gateway: ENUM('midtrans', 'xendit')
payment_method: ENUM('credit_card', 'bank_transfer', 'e_wallet', 'qris')
payment_gateway_transaction_id: VARCHAR(255)
amount: DECIMAL(15,2) NOT NULL
status: ENUM('pending', 'success', 'failed', 'expired')
payment_url: VARCHAR(500) NULL
paid_at: TIMESTAMP NULL
expired_at: TIMESTAMP NULL
metadata: JSON
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_invoice_id (invoice_id)
INDEX idx_gateway_transaction_id (payment_gateway_transaction_id)
```


**payment_methods**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
type: ENUM('credit_card', 'bank_account')
card_last_four: VARCHAR(4) NULL
card_brand: VARCHAR(50) NULL
card_exp_month: INT NULL
card_exp_year: INT NULL
bank_name: VARCHAR(100) NULL
account_number_last_four: VARCHAR(4) NULL
is_default: BOOLEAN DEFAULT FALSE
payment_gateway: ENUM('midtrans', 'xendit')
gateway_customer_id: VARCHAR(255)
gateway_payment_method_id: VARCHAR(255)
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_company_id (company_id)
```

**payment_webhooks**
```sql
id: UUID PRIMARY KEY
payment_gateway: ENUM('midtrans', 'xendit')
event_type: VARCHAR(100) NOT NULL
payload: JSON NOT NULL
signature: VARCHAR(500)
is_verified: BOOLEAN DEFAULT FALSE
is_processed: BOOLEAN DEFAULT FALSE
processed_at: TIMESTAMP NULL
error_message: TEXT NULL
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_gateway_event (payment_gateway, event_type)
INDEX idx_processed (is_processed)
```


#### Business Operations Tables

**stores**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
name: VARCHAR(255) NOT NULL
code: VARCHAR(50) NOT NULL
address: TEXT
city: VARCHAR(100)
province: VARCHAR(100)
postal_code: VARCHAR(20)
phone: VARCHAR(50)
email: VARCHAR(255)
manager_id: UUID NULL FOREIGN KEY REFERENCES users(id)
is_active: BOOLEAN DEFAULT TRUE
opening_hours: JSON
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at: TIMESTAMP NULL
UNIQUE KEY unique_company_code (company_id, code)
INDEX idx_company_id (company_id)
```

**categories**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
name: VARCHAR(255) NOT NULL
slug: VARCHAR(255) NOT NULL
description: TEXT
parent_id: UUID NULL FOREIGN KEY REFERENCES categories(id)
image_url: VARCHAR(500)
sort_order: INT DEFAULT 0
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at: TIMESTAMP NULL
UNIQUE KEY unique_company_slug (company_id, slug)
INDEX idx_company_parent (company_id, parent_id)
```


**products**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
category_id: UUID NULL FOREIGN KEY REFERENCES categories(id)
name: VARCHAR(255) NOT NULL
slug: VARCHAR(255) NOT NULL
sku: VARCHAR(100) UNIQUE
barcode: VARCHAR(100)
description: TEXT
base_price: DECIMAL(15,2) NOT NULL
cost_price: DECIMAL(15,2) DEFAULT 0
tax_percentage: DECIMAL(5,2) DEFAULT 0
unit: VARCHAR(50) (pcs, kg, liter, etc)
has_variants: BOOLEAN DEFAULT FALSE
track_inventory: BOOLEAN DEFAULT TRUE
min_stock: INT DEFAULT 0
image_url: VARCHAR(500)
images: JSON (array of image URLs)
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at: TIMESTAMP NULL
UNIQUE KEY unique_company_slug (company_id, slug)
INDEX idx_company_category (company_id, category_id)
INDEX idx_sku (sku)
INDEX idx_barcode (barcode)
```

**product_variants**
```sql
id: UUID PRIMARY KEY
product_id: UUID FOREIGN KEY REFERENCES products(id)
company_id: UUID FOREIGN KEY REFERENCES companies(id)
name: VARCHAR(255) NOT NULL
sku: VARCHAR(100) UNIQUE
barcode: VARCHAR(100)
price: DECIMAL(15,2) NOT NULL
cost_price: DECIMAL(15,2) DEFAULT 0
attributes: JSON (size: L, color: red, etc)
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at: TIMESTAMP NULL
INDEX idx_product_id (product_id)
INDEX idx_sku (sku)
INDEX idx_barcode (barcode)
```


**inventory**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
store_id: UUID FOREIGN KEY REFERENCES stores(id)
product_id: UUID FOREIGN KEY REFERENCES products(id)
variant_id: UUID NULL FOREIGN KEY REFERENCES product_variants(id)
quantity: INT DEFAULT 0
reserved_quantity: INT DEFAULT 0
available_quantity: INT GENERATED ALWAYS AS (quantity - reserved_quantity) STORED
last_restock_date: DATE NULL
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
UNIQUE KEY unique_store_product_variant (store_id, product_id, variant_id)
INDEX idx_company_store (company_id, store_id)
INDEX idx_low_stock (company_id, available_quantity)
```

**inventory_movements**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
store_id: UUID FOREIGN KEY REFERENCES stores(id)
product_id: UUID FOREIGN KEY REFERENCES products(id)
variant_id: UUID NULL FOREIGN KEY REFERENCES product_variants(id)
type: ENUM('in', 'out', 'adjustment', 'transfer', 'sale', 'return')
quantity: INT NOT NULL
reference_type: VARCHAR(50) (transaction, purchase_order, transfer, etc)
reference_id: UUID NULL
notes: TEXT
performed_by: UUID FOREIGN KEY REFERENCES users(id)
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_company_store (company_id, store_id)
INDEX idx_product (product_id)
INDEX idx_reference (reference_type, reference_id)
```


#### Transaction Management Tables

**transactions**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
store_id: UUID FOREIGN KEY REFERENCES stores(id)
transaction_number: VARCHAR(50) UNIQUE NOT NULL
customer_id: UUID NULL FOREIGN KEY REFERENCES customers(id)
cashier_id: UUID FOREIGN KEY REFERENCES users(id)
transaction_type: ENUM('sale', 'return', 'void')
subtotal: DECIMAL(15,2) NOT NULL
discount_amount: DECIMAL(15,2) DEFAULT 0
tax_amount: DECIMAL(15,2) DEFAULT 0
total_amount: DECIMAL(15,2) NOT NULL
payment_status: ENUM('pending', 'partial', 'paid', 'refunded')
notes: TEXT
voided_at: TIMESTAMP NULL
voided_by: UUID NULL FOREIGN KEY REFERENCES users(id)
void_reason: TEXT NULL
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_company_store (company_id, store_id)
INDEX idx_transaction_number (transaction_number)
INDEX idx_customer_id (customer_id)
INDEX idx_created_at (created_at)
```

**transaction_items**
```sql
id: UUID PRIMARY KEY
transaction_id: UUID FOREIGN KEY REFERENCES transactions(id)
product_id: UUID FOREIGN KEY REFERENCES products(id)
variant_id: UUID NULL FOREIGN KEY REFERENCES product_variants(id)
product_name: VARCHAR(255) NOT NULL
quantity: INT NOT NULL
unit_price: DECIMAL(15,2) NOT NULL
discount_amount: DECIMAL(15,2) DEFAULT 0
tax_amount: DECIMAL(15,2) DEFAULT 0
subtotal: DECIMAL(15,2) NOT NULL
notes: TEXT
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_transaction_id (transaction_id)
INDEX idx_product_id (product_id)
```


**transaction_payments**
```sql
id: UUID PRIMARY KEY
transaction_id: UUID FOREIGN KEY REFERENCES transactions(id)
payment_method: ENUM('cash', 'credit_card', 'debit_card', 'e_wallet', 'bank_transfer', 'qris')
amount: DECIMAL(15,2) NOT NULL
reference_number: VARCHAR(255) NULL
notes: TEXT
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_transaction_id (transaction_id)
```

**discounts**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
name: VARCHAR(255) NOT NULL
code: VARCHAR(50) UNIQUE
type: ENUM('percentage', 'fixed_amount')
value: DECIMAL(15,2) NOT NULL
min_purchase_amount: DECIMAL(15,2) DEFAULT 0
max_discount_amount: DECIMAL(15,2) NULL
applicable_to: ENUM('all', 'category', 'product')
applicable_ids: JSON (array of category_ids or product_ids)
start_date: DATE NOT NULL
end_date: DATE NOT NULL
usage_limit: INT NULL
usage_count: INT DEFAULT 0
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_company_code (company_id, code)
INDEX idx_dates (start_date, end_date)
```


#### Customer Management Tables

**customers**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
customer_number: VARCHAR(50) UNIQUE NOT NULL
full_name: VARCHAR(255) NOT NULL
email: VARCHAR(255)
phone: VARCHAR(50)
address: TEXT
city: VARCHAR(100)
province: VARCHAR(100)
postal_code: VARCHAR(20)
date_of_birth: DATE NULL
gender: ENUM('male', 'female', 'other') NULL
loyalty_points: INT DEFAULT 0
loyalty_tier: ENUM('regular', 'silver', 'gold', 'platinum') DEFAULT 'regular'
total_spent: DECIMAL(15,2) DEFAULT 0
total_transactions: INT DEFAULT 0
last_transaction_at: TIMESTAMP NULL
notes: TEXT
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at: TIMESTAMP NULL
UNIQUE KEY unique_company_customer_number (company_id, customer_number)
INDEX idx_company_id (company_id)
INDEX idx_phone (phone)
INDEX idx_email (email)
```

**loyalty_point_transactions**
```sql
id: UUID PRIMARY KEY
customer_id: UUID FOREIGN KEY REFERENCES customers(id)
company_id: UUID FOREIGN KEY REFERENCES companies(id)
type: ENUM('earn', 'redeem', 'adjustment', 'expire')
points: INT NOT NULL
balance_after: INT NOT NULL
reference_type: VARCHAR(50) (transaction, manual, etc)
reference_id: UUID NULL
description: TEXT
performed_by: UUID NULL FOREIGN KEY REFERENCES users(id)
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_customer_id (customer_id)
INDEX idx_created_at (created_at)
```


#### Employee Management Tables

**employees**
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
user_id: UUID FOREIGN KEY REFERENCES users(id)
employee_number: VARCHAR(50) UNIQUE NOT NULL
store_id: UUID NULL FOREIGN KEY REFERENCES stores(id)
position: VARCHAR(100)
hire_date: DATE NOT NULL
salary: DECIMAL(15,2) DEFAULT 0
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
deleted_at: TIMESTAMP NULL
UNIQUE KEY unique_company_employee_number (company_id, employee_number)
INDEX idx_company_store (company_id, store_id)
INDEX idx_user_id (user_id)
```

**employee_attendance**
```sql
id: UUID PRIMARY KEY
employee_id: UUID FOREIGN KEY REFERENCES employees(id)
company_id: UUID FOREIGN KEY REFERENCES companies(id)
store_id: UUID FOREIGN KEY REFERENCES stores(id)
clock_in_at: TIMESTAMP NOT NULL
clock_out_at: TIMESTAMP NULL
work_duration_minutes: INT NULL
notes: TEXT
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_employee_id (employee_id)
INDEX idx_clock_in_date (clock_in_at)
```


#### Notification & Audit Tables

**notifications**
```sql
id: UUID PRIMARY KEY
company_id: UUID NULL FOREIGN KEY REFERENCES companies(id)
user_id: UUID NULL FOREIGN KEY REFERENCES users(id)
type: ENUM('subscription_expiring', 'subscription_expired', 'subscription_suspended', 'payment_success', 'payment_failed', 'low_stock', 'system')
title: VARCHAR(255) NOT NULL
message: TEXT NOT NULL
data: JSON
channels: JSON (email, sms, whatsapp, in_app)
is_read: BOOLEAN DEFAULT FALSE
read_at: TIMESTAMP NULL
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_company_user (company_id, user_id)
INDEX idx_is_read (is_read)
INDEX idx_created_at (created_at)
```

**notification_queue**
```sql
id: UUID PRIMARY KEY
notification_id: UUID FOREIGN KEY REFERENCES notifications(id)
channel: ENUM('email', 'sms', 'whatsapp', 'push')
recipient: VARCHAR(255) NOT NULL
status: ENUM('pending', 'sent', 'failed')
attempts: INT DEFAULT 0
last_attempt_at: TIMESTAMP NULL
sent_at: TIMESTAMP NULL
error_message: TEXT NULL
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_status (status)
INDEX idx_created_at (created_at)
```


**audit_logs**
```sql
id: UUID PRIMARY KEY
company_id: UUID NULL FOREIGN KEY REFERENCES companies(id)
user_id: UUID NULL FOREIGN KEY REFERENCES users(id)
action: VARCHAR(100) NOT NULL
resource_type: VARCHAR(100) NOT NULL
resource_id: UUID NULL
old_values: JSON NULL
new_values: JSON NULL
ip_address: VARCHAR(45)
user_agent: VARCHAR(500)
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_company_id (company_id)
INDEX idx_user_id (user_id)
INDEX idx_resource (resource_type, resource_id)
INDEX idx_created_at (created_at)
```

#### Industry-Specific Tables

**fnb_tables** (Food & Beverage)
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
store_id: UUID FOREIGN KEY REFERENCES stores(id)
table_number: VARCHAR(50) NOT NULL
capacity: INT NOT NULL
status: ENUM('available', 'occupied', 'reserved', 'cleaning')
current_transaction_id: UUID NULL FOREIGN KEY REFERENCES transactions(id)
floor: VARCHAR(50) NULL
section: VARCHAR(50) NULL
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
UNIQUE KEY unique_store_table (store_id, table_number)
INDEX idx_company_store (company_id, store_id)
INDEX idx_status (status)
```


**fnb_orders** (Food & Beverage)
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
store_id: UUID FOREIGN KEY REFERENCES stores(id)
transaction_id: UUID FOREIGN KEY REFERENCES transactions(id)
table_id: UUID NULL FOREIGN KEY REFERENCES fnb_tables(id)
order_type: ENUM('dine_in', 'takeaway', 'delivery')
order_status: ENUM('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled')
customer_name: VARCHAR(255) NULL
delivery_address: TEXT NULL
delivery_fee: DECIMAL(15,2) DEFAULT 0
notes: TEXT
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_company_store (company_id, store_id)
INDEX idx_table_id (table_id)
INDEX idx_order_status (order_status)
```

**laundry_orders** (Laundry)
```sql
id: UUID PRIMARY KEY
company_id: UUID FOREIGN KEY REFERENCES companies(id)
store_id: UUID FOREIGN KEY REFERENCES stores(id)
transaction_id: UUID FOREIGN KEY REFERENCES transactions(id)
customer_id: UUID FOREIGN KEY REFERENCES customers(id)
order_number: VARCHAR(50) UNIQUE NOT NULL
service_type: ENUM('wash_dry', 'wash_iron', 'dry_clean', 'iron_only')
weight_kg: DECIMAL(10,2) NULL
item_count: INT NULL
status: ENUM('received', 'washing', 'drying', 'ironing', 'ready', 'delivered', 'cancelled')
pickup_date: DATE NULL
delivery_date: DATE NULL
notes: TEXT
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
INDEX idx_company_store (company_id, store_id)
INDEX idx_customer_id (customer_id)
INDEX idx_status (status)
INDEX idx_order_number (order_number)
```


**laundry_items** (Laundry)
```sql
id: UUID PRIMARY KEY
laundry_order_id: UUID FOREIGN KEY REFERENCES laundry_orders(id)
item_type: VARCHAR(100) NOT NULL (shirt, pants, dress, etc)
quantity: INT NOT NULL
barcode: VARCHAR(100) NULL
notes: TEXT
created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
INDEX idx_laundry_order_id (laundry_order_id)
INDEX idx_barcode (barcode)
```

### Data Relationships

**Multi-Tenant Isolation**:
- All tenant-scoped tables include `company_id` foreign key
- Queries automatically filtered by `company_id` from JWT token
- System tables (subscription_plans, add_ons, roles, permissions) have no `company_id`

**Subscription Flow**:
```
companies → subscriptions → subscription_plans
subscriptions → subscription_history (audit trail)
subscriptions → invoices → payment_transactions
```

**Add-on Flow**:
```
companies → company_add_ons → add_ons
company_add_ons → invoices → payment_transactions
```

**Business Operations**:
```
companies → stores → inventory → products
companies → products → categories
products → product_variants
inventory → inventory_movements
```

**Transaction Flow**:
```
stores → transactions → transaction_items → products
transactions → transaction_payments
transactions → customers → loyalty_point_transactions
```

**Employee Management**:
```
companies → employees → users
employees → employee_attendance
employees → stores
```

---

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Registration with Missing Required Fields is Rejected

For any registration attempt, if any required field (company name, email, password, business type, owner name) is missing or empty, the registration should be rejected with a validation error.

**Validates: Requirements 4.1.1 - Form registrasi lengkap**

### Property 2: Payment Success Activates Subscription

For any pending subscription, when a payment transaction is marked as successful, the subscription status should transition to active, the company status should transition to active, and start_date and end_date should be set.

**Validates: Requirements 4.1.1 - Auto-activate account, 4.1.3 - Auto-activate setelah payment**

### Property 3: Subscription End Date Calculation

For any subscription with a start_date and duration_months, the end_date should equal start_date plus duration_months (1 month = 30 days, 3 months = 90 days, 6 months = 180 days, 12 months = 365 days).

**Validates: Requirements 4.1.3 - Set subscription end date based on duration, 4.3.1 - Calculate exact expiry date**

### Property 4: Duration Discount Calculation

For any subscription plan with base_price_monthly and duration_months, the final_price should equal (base_price_monthly * duration_months) * (1 - discount_percentage), where discount is 0% for 1 month, 5% for 3 months, 10% for 6 months, and 20% for 12 months.

**Validates: Requirements 4.3.1 - Member bisa pilih duration dengan discount, Show discount calculation**

### Property 5: Webhook Signature Verification

For any payment webhook, if the signature verification fails, the webhook should be rejected and not processed, and the payment status should remain unchanged.

**Validates: Requirements 4.1.2 - Secure webhook verification**


### Property 6: Payment Status Determines Subscription Status

For any subscription with an associated payment transaction, the subscription status should reflect the payment status: pending payment → pending subscription, successful payment → active subscription, failed payment → subscription remains pending, expired payment → subscription can be cancelled.

**Validates: Requirements 4.1.2 - Handle payment success/pending/failed/expired**

### Property 7: Expired Subscriptions Enter Grace Period

For any active subscription where current_date > end_date, the subscription status should transition to expired and grace_period_end_date should be set to end_date + 3 days.

**Validates: Requirements 4.3.2 - Auto-update status based on expiry date, 4.3.5 - Auto-enable grace period**

### Property 8: Grace Period Allows Read-Only Access

For any subscription with status expired (within grace period), read operations should succeed but create/update/delete operations should be rejected with an appropriate error message.

**Validates: Requirements 4.3.5 - Restrict write operations, Allow read operations**

### Property 9: Suspended Accounts Block Login

For any company with subscription status suspended, login attempts by any user of that company should be rejected with a suspension message and renewal link.

**Validates: Requirements 4.3.6 - Block login untuk suspended account**

### Property 10: Auto-Suspension After Grace Period

For any expired subscription where current_date > grace_period_end_date, the subscription status should automatically transition to suspended.

**Validates: Requirements 4.3.6 - Auto-suspend setelah grace period**

### Property 11: Renewal Extends Subscription from Current End Date

For any active or expiring subscription that is renewed, the new end_date should equal the current end_date plus the renewal duration_months.

**Validates: Requirements 4.3.4 - Renewal extends subscription**


### Property 12: Reactivation Calculates from Today

For any suspended subscription that is reactivated with payment, the new start_date should be set to current_date and end_date should be current_date plus duration_months (not extending from old end_date).

**Validates: Requirements 4.3.7 - Calculate new expiry date from today**

### Property 13: Reactivation Restores Full Access

For any suspended subscription that is reactivated, the subscription status should transition to active and all create/update/delete operations should be permitted.

**Validates: Requirements 4.3.7 - Restore full access**

### Property 14: Suspended Data Persistence

For any company that transitions from active to suspended and then back to active, all data (products, transactions, customers, employees) should remain unchanged and accessible.

**Validates: Requirements 4.3.7 - All data tetap utuh**

### Property 15: Renewal Notifications Timeline

For any active subscription, renewal reminder notifications should be created at exactly -7, -3, and -1 days before end_date, and expiry notifications at 0, +1, +2, +3 days relative to end_date.

**Validates: Requirements 4.3.3 - Auto-send notification based on timeline**

### Property 16: No Duplicate Notifications

For any subscription and notification type (e.g., "7 days before expiry"), only one notification should be created for each time period, even if the check runs multiple times.

**Validates: Requirements 4.3.3 - Prevent duplicate notifications**

### Property 17: Add-on Activation After Payment

For any company_add_on with a successful payment transaction, the add_on status should transition to active and the corresponding feature should be enabled for that company.

**Validates: Requirements 4.2.2 - Auto-activate add-on setelah payment sukses, Feature available**


### Property 18: Stock Adjustment Updates Inventory

For any inventory record, when a stock adjustment of quantity Q is applied, the new inventory quantity should equal the old quantity plus Q (for stock-in) or minus Q (for stock-out).

**Validates: Requirements 5.1 - Stock management, Real-time stock tracking**

### Property 19: Stock Transfer Conservation

For any stock transfer of quantity Q from store A to store B for a product, store A's inventory should decrease by Q and store B's inventory should increase by Q, and the total quantity across all stores should remain constant.

**Validates: Requirements 5.1 - Stock transfer antar cabang**

### Property 20: Transaction Total Calculation

For any transaction with items, discounts, and taxes, the total_amount should equal sum(item.subtotal) - discount_amount + tax_amount, where item.subtotal = quantity * unit_price - item.discount_amount + item.tax_amount.

**Validates: Requirements 5.1 - Calculate transaction total**

### Property 21: Split Payment Sum Equals Total

For any transaction with multiple payment records, the sum of all payment amounts should equal the transaction total_amount.

**Validates: Requirements 5.1 - Multiple payment methods**

### Property 22: Void Transaction Restores Inventory

For any transaction that is voided, all inventory quantities for products in that transaction should be restored (increased by the transaction quantities), and the transaction status should be marked as voided.

**Validates: Requirements 5.1 - Void transaction**

### Property 23: Loyalty Points Balance Consistency

For any customer, the current loyalty_points should equal the sum of all loyalty_point_transactions for that customer where type=earn minus sum where type=redeem.

**Validates: Requirements 5.1 - Loyalty points**


### Property 24: Transaction Reduces Inventory

For any completed transaction, the inventory quantity for each product in the transaction should be reduced by the transaction item quantity.

**Validates: Requirements 5.1 - Real-time stock tracking**

### Property 25: Invalid JWT Tokens Rejected

For any API request with an invalid, expired, or malformed JWT token, the request should be rejected with a 401 Unauthorized error.

**Validates: Requirements 6.2 - JWT authentication**

### Property 26: Permission-Based Access Control

For any API request by a user, if the user's role does not have the required permission for the requested resource and action, the request should be rejected with a 403 Forbidden error.

**Validates: Requirements 6.2 - Role-based access control**

### Property 27: Multi-Tenant Data Isolation

For any query by a user with company_id X, the results should only include records where company_id = X, and no records from other companies should be accessible.

**Validates: Requirements 2.1 - Multi-tenant architecture**

### Property 28: New Company Has Default Store

For any newly created company after successful registration and payment, at least one store record should exist with that company_id.

**Validates: Requirements 4.1.3 - Create default store untuk member**

### Property 29: Welcome Email Queued After Activation

For any company that transitions from pending to active status, a welcome email notification should be added to the notification queue for the owner user.

**Validates: Requirements 4.1.1 - Send welcome email dengan login credentials**

### Property 30: Invoice PDF Generated After Payment

For any invoice with status paid, an invoice_pdf_url should be generated and an invoice email notification should be queued.

**Validates: Requirements 4.1.1 - Send invoice via email, 4.1.2 - Generate invoice PDF**

---

## Error Handling

### API Error Responses

All API errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "timestamp": "2026-03-28T10:30:00Z",
  "path": "/api/auth/register"
}
```

### Error Categories

**Validation Errors (400 Bad Request)**:
- Missing required fields
- Invalid data format (email, phone, date)
- Business rule violations (e.g., negative stock)
- Constraint violations (e.g., duplicate email)

**Authentication Errors (401 Unauthorized)**:
- Invalid credentials
- Expired or invalid JWT token
- Missing authentication token
- Email not verified

**Authorization Errors (403 Forbidden)**:
- Insufficient permissions for action
- Subscription expired (grace period ended)
- Subscription suspended
- Feature not available in current plan

**Not Found Errors (404 Not Found)**:
- Resource does not exist
- Resource belongs to different company (multi-tenant isolation)

**Conflict Errors (409 Conflict)**:
- Duplicate unique constraint (email, SKU, barcode)
- Concurrent modification conflict
- State transition not allowed (e.g., cannot renew cancelled subscription)

**Payment Errors (402 Payment Required)**:
- Subscription expired, renewal required
- Insufficient balance for operation
- Payment gateway error

**Server Errors (500 Internal Server Error)**:
- Unexpected system errors
- Database connection failures
- External service failures (payment gateway, email service)


### Error Handling Strategies

**Graceful Degradation**:
- If payment gateway is down, queue payment for retry
- If email service fails, queue notification for retry
- If cache is unavailable, fall back to database

**Retry Logic**:
- Payment webhooks: Retry 3 times with exponential backoff (1min, 5min, 15min)
- Email notifications: Retry 5 times over 24 hours
- External API calls: Retry 3 times with 1-second delay

**Transaction Rollback**:
- If any step in registration fails after payment, refund automatically
- If inventory update fails during transaction, rollback entire transaction
- If subscription activation fails, mark payment for manual review

**Logging & Monitoring**:
- All errors logged with context (user_id, company_id, request_id)
- Critical errors trigger alerts (payment failures, data corruption)
- Error rates monitored per endpoint
- Failed webhook attempts logged for manual retry

**User-Friendly Messages**:
- Technical errors translated to user-friendly messages
- Provide actionable guidance (e.g., "Please contact support with reference ID: XYZ")
- Avoid exposing sensitive system information

---

## Testing Strategy

### Dual Testing Approach

The system requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Specific registration scenarios (valid data, missing fields, duplicate email)
- Payment webhook handling for each gateway (Midtrans, Xendit)
- Subscription status transitions (active → expired → suspended)
- Integration points between services
- Edge cases (empty cart, zero quantity, negative prices)

**Property-Based Tests**: Verify universal properties across all inputs
- Subscription date calculations for any duration
- Transaction total calculations for any combination of items/discounts/taxes
- Stock adjustments for any quantity and operation type
- Multi-tenant isolation for any company_id
- Permission checks for any user role and resource

Together, unit tests catch concrete bugs while property tests verify general correctness.


### Property-Based Testing Configuration

**Framework**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: MonetraPOS-complete-system, Property {number}: {property_text}`

**Example Property Test**:

```typescript
import * as fc from 'fast-check';

describe('Feature: MonetraPOS-complete-system, Property 3: Subscription End Date Calculation', () => {
  it('should calculate end_date correctly for any start_date and duration', () => {
    fc.assert(
      fc.property(
        fc.date(), // random start_date
        fc.constantFrom(1, 3, 6, 12), // random duration_months
        (startDate, durationMonths) => {
          const endDate = calculateSubscriptionEndDate(startDate, durationMonths);
          
          const expectedDays = {
            1: 30,
            3: 90,
            6: 180,
            12: 365
          }[durationMonths];
          
          const actualDays = Math.floor(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          expect(actualDays).toBe(expectedDays);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Coverage Goals**:
- Minimum 80% code coverage
- 100% coverage for critical paths (payment, subscription, authentication)
- All error handling paths tested

**Test Organization**:
- Unit tests colocated with source files (`*.spec.ts`)
- Integration tests in separate `test/integration` directory
- E2E tests in `test/e2e` directory

**Key Unit Test Areas**:
- Service layer business logic
- Controller input validation
- Repository query correctness
- Middleware functionality (tenant, auth, logging)
- Utility functions (date calculations, price calculations)
- Error handling and edge cases


### Integration Testing

**Scope**:
- API endpoint testing with real database (test database)
- Payment gateway integration (using sandbox/test mode)
- Email service integration (using test email service)
- Webhook handling end-to-end
- Multi-tenant isolation verification

**Tools**:
- Supertest for HTTP testing
- Test containers for MySQL database
- Mock servers for external services (when needed)

### End-to-End Testing

**Critical User Flows**:
1. Complete registration → payment → activation flow
2. Subscription renewal before expiry
3. Grace period → suspension → reactivation flow
4. Add-on purchase and activation
5. Complete POS transaction with inventory update
6. Multi-store stock transfer
7. Customer loyalty points earn and redeem

**Tools**:
- Playwright or Cypress for browser automation
- Test data factories for consistent test data
- Database seeding for test scenarios

### Performance Testing

**Load Testing**:
- Simulate 1000+ concurrent users
- Test API response times under load
- Identify bottlenecks and optimize

**Stress Testing**:
- Test system behavior at limits
- Verify graceful degradation
- Test recovery after failures

**Tools**:
- k6 or Artillery for load testing
- Database query profiling
- APM tools (New Relic, DataDog)

---

## Implementation Notes

### Phase 1 Priority (MVP)

**Core Features**:
1. Registration & payment flow (Midtrans integration)
2. Subscription management (create, renew, status checks)
3. Basic authentication & authorization
4. Product management (CRUD)
5. Simple POS transactions
6. Basic inventory tracking
7. Company and store management

**Deferred to Later Phases**:
- Xendit integration (Phase 2)
- Add-ons marketplace (Phase 2)
- Advanced reporting (Phase 2)
- Mobile POS app (Phase 3)
- Industry-specific features (Phase 2-3)
- Auto-renewal (Phase 3)
- Multi-language support (Phase 3)


### Technology Stack

**Backend**:
- Framework: NestJS (TypeScript)
- Database: MySQL 8.0+
- ORM: TypeORM
- Cache: Redis
- Queue: Bull (Redis-based)
- Validation: class-validator, class-transformer
- Authentication: Passport.js with JWT strategy
- Testing: Jest, fast-check, Supertest

**Frontend**:
- Framework: Next.js 14+ (App Router)
- UI Library: React 18+
- Styling: Tailwind CSS
- State Management: Zustand or React Query
- Forms: React Hook Form with Zod validation
- Charts: Recharts or Chart.js
- Testing: Vitest, React Testing Library, Playwright

**Infrastructure**:
- Hosting: AWS or DigitalOcean
- CDN: CloudFlare
- File Storage: AWS S3 or DigitalOcean Spaces
- Email: SendGrid or AWS SES
- Monitoring: Sentry for errors, DataDog for APM
- CI/CD: GitHub Actions

**Payment Gateways**:
- Midtrans (Phase 1)
- Xendit (Phase 2)

### Security Considerations

**Authentication**:
- Passwords hashed with bcrypt (cost factor 10)
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- Token rotation on refresh
- Secure HTTP-only cookies for web clients

**Authorization**:
- Role-based access control (RBAC)
- Permission checks at service layer
- Resource ownership verification
- Multi-tenant isolation enforced at middleware level

**Data Protection**:
- Sensitive data encrypted at rest (AES-256)
- TLS 1.3 for data in transit
- Database credentials in environment variables
- API keys rotated regularly
- PCI DSS compliance for payment data (handled by gateways)

**API Security**:
- Rate limiting (100 requests/minute per IP)
- CORS configured for allowed origins
- CSRF protection for state-changing operations
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)

---

**Document Status**: Complete  
**Last Updated**: 28 Maret 2026  
**Next Step**: Create implementation tasks


