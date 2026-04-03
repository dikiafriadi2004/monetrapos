# Implementation Tasks - MonetRAPOS Complete System

**Feature Name**: MonetRAPOS Complete System  
**Type**: SaaS Multi-Tenant POS System  
**Status**: Ready for Implementation  
**Created**: 28 Maret 2026

---

## Overview

This document outlines the implementation tasks for the MonetRAPOS Complete System, organized into four phases:

1. **Phase 1: MVP (Core Features)** - Essential POS functionality with subscription management
2. **Phase 2: Enhancement** - Industry-specific features and advanced capabilities
3. **Phase 3: Mobile & Integration** - Mobile app and external integrations
4. **Phase 4: Scale & Optimize** - Performance optimization and advanced features

Each task references specific requirements and correctness properties from the design document. Tasks marked with `*` are optional and can be skipped for faster MVP delivery.

## Implementation Approach: HYBRID (Refactor + Extend)

**This project uses a HYBRID approach** - we will leverage existing code while refactoring and extending it to meet the new requirements:

- **Keep & Improve (70%)**: Existing modules (auth, subscriptions, companies, products, etc.) will be enhanced
- **Refactor (20%)**: Database schema and business logic will be updated to match new design
- **Add New (10%)**: New features (payment gateway, add-ons, property tests) will be added

**Key Principles:**
- ✅ Reuse existing NestJS modules and structure
- ✅ Add missing database fields via migrations (not recreate tables)
- ✅ Extend existing services with new methods
- ✅ Keep existing API endpoints, add new ones as needed
- ✅ Refactor incrementally, test continuously

---

## Phase 1: MVP (Core Features)

### 1. Database Schema Updates (Migrations)

- [x] 1.1 Create migration for subscription enhancements
  - Add `duration_months` column to subscriptions table (1, 3, 6, 12)
  - Add `grace_period_end_date` column to subscriptions table
  - Update `status` enum to include 'pending', 'expired', 'suspended'
  - Add `start_date` and `end_date` columns (if not exists)
  - _Requirements: 4.3.1, 4.3.2_
  - _Note: Existing subscriptions table already has basic structure_

- [x] 1.2 Create subscription_durations table
  - Create new table for duration-based pricing
  - Columns: id, plan_id, duration_months, discount_percentage, final_price
  - Add foreign key to subscription_plans
  - Seed default durations (1/3/6/12 months with 0%/5%/10%/20% discounts)
  - _Requirements: 4.3.1_

- [x] 1.3 Create payment gateway tables
  - Create payment_transactions table (if not exists)
  - Create payment_webhooks table for webhook logging
  - Create invoices table enhancements (add invoice_pdf_url, invoice_type)
  - Add indexes for performance
  - _Requirements: 4.1.2_

- [x] 1.4 Create add_ons and company_add_ons tables
  - Create add_ons table (name, slug, description, category, price_monthly)
  - Create company_add_ons table (company_id, add_on_id, status, dates)
  - Add indexes and foreign keys
  - _Requirements: 4.2.1, 4.2.2_

- [x] 1.5 Set up Redis and Bull queue (if not exists)
  - Configure Redis connection
  - Set up Bull queue for background jobs (notifications, emails)
  - Create queue processors
  - _Requirements: 6.3_


- [ ] 1.4 Write property tests for database entities
  - **Property 27: Multi-Tenant Data Isolation**
  - **Validates: Requirements 2.1**

### 2. Enhance Authentication & Authorization System

- [x] 2.1 Refactor existing AuthService for payment flow
  - Update registerCompany() to create pending subscription (not trial)
  - Remove auto-activation, wait for payment
  - Keep existing JWT and bcrypt implementation
  - Update login() to check subscription status (block if suspended)
  - _Requirements: 3.1, 3.2, 4.1.1_
  - _Note: Existing AuthService already has good foundation_

- [x] 2.2 Enhance tenant middleware
  - Update existing middleware to extract company_id from JWT
  - Add subscription status check middleware
  - Block write operations if status is 'expired' (grace period)
  - Block all operations if status is 'suspended'
  - _Requirements: 3.1, 3.2, 6.2_

- [-]* 2.3 Write property tests for authentication
  - **Property 25: Invalid JWT Tokens Rejected**
  - **Property 9: Suspended Accounts Block Login**
  - **Validates: Requirements 6.2, 4.3.6**

- [x] 2.4 Enhance role and permission system (if needed)
  - Review existing roles implementation
  - Add missing permissions if any
  - Ensure RBAC is properly enforced
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 2.5 Write property tests for authorization
  - **Property 26: Permission-Based Access Control**
  - **Property 27: Multi-Tenant Data Isolation**
  - **Validates: Requirements 6.2**

### 3. Registration & Payment Flow (Midtrans)

- [x] 3.1 Enhance subscription plans with duration pricing
  - Update existing SubscriptionPlansService
  - Add methods to manage subscription_durations
  - Implement discount calculation logic
  - Seed default plans with duration options
  - _Requirements: 4.1.1, 4.3.1_
  - _Note: Existing SubscriptionPlansService already exists_

- [x] 3.2 Refactor registration to support payment flow
  - Update existing RegisterDto to include plan_id and duration_months
  - Modify registerCompany() to create pending company and subscription
  - Generate invoice after registration
  - Return payment URL instead of auto-activating
  - _Requirements: 4.1.1_

- [ ]* 3.3 Write property tests for registration validation
  - **Property 1: Registration with Missing Required Fields is Rejected**
  - **Validates: Requirements 4.1.1**

- [x] 3.4 Integrate Midtrans payment gateway
  - Install Midtrans SDK (@midtrans/midtrans-nodejs)
  - Create PaymentGatewayService (new module)
  - Implement createPayment() method for Snap
  - Generate payment URL and store transaction
  - _Requirements: 4.1.2_
  - _Status: ✅ COMPLETE (2 April 2026) - See TASK-3.4-MIDTRANS-INTEGRATION-COMPLETE.md_

- [x] 3.5 Implement Midtrans webhook handler
  - Create PaymentController.handleMidtransWebhook() endpoint
  - Verify webhook signature
  - Parse notification payload
  - Update payment_transactions status
  - Trigger subscription activation on success
  - Log all webhooks to payment_webhooks table
  - _Requirements: 4.1.2_
  - _Status: ✅ COMPLETE (2 April 2026) - Implemented in Task 3.4_

- [ ]* 3.6 Write property tests for webhook security
  - **Property 5: Webhook Signature Verification**
  - **Property 6: Payment Status Determines Subscription Status**
  - **Validates: Requirements 4.1.2**

- [x] 3.7 Enhance subscription activation logic
  - Update existing SubscriptionsService.createSubscription()
  - Add activateSubscription() method
  - Set start_date, calculate end_date based on duration_months
  - Update company status to active
  - Create default store
  - Queue welcome email
  - _Requirements: 4.1.3_
  - _Status: ✅ COMPLETE (2 April 2026) - Implemented in Task 3.4_

- [ ]* 3.8 Write property tests for subscription activation
  - **Property 2: Payment Success Activates Subscription**
  - **Property 3: Subscription End Date Calculation**
  - **Property 4: Duration Discount Calculation**
  - **Validates: Requirements 4.1.3, 4.3.1**

- [x] 3.9 Implement default store creation
  - Update StoresService (existing) to create default store
  - Call from subscription activation
  - _Requirements: 4.1.3_

- [ ]* 3.10 Write property tests for default store
  - **Property 28: New Company Has Default Store**
  - **Validates: Requirements 4.1.3**

- [x] 3.11 Implement notification system
  - Create NotificationService (new or enhance existing)
  - Implement email queue with Bull
  - Create welcome email template
  - Queue welcome email after activation
  - _Requirements: 4.1.1, 4.1.3_

- [ ]* 3.12 Write property tests for notifications
  - **Property 29: Welcome Email Queued After Activation**
  - **Validates: Requirements 4.1.1**

- [x] 3.13 Implement invoice PDF generation
  - Install PDF library (pdfkit or puppeteer)
  - Create invoice template
  - Generate PDF after payment
  - Upload to storage and save URL
  - Queue invoice email
  - _Requirements: 4.1.2_

- [ ]* 3.14 Write property tests for invoice
  - **Property 30: Invoice PDF Generated After Payment**
  - **Validates: Requirements 4.1.1, 4.1.2**

- [x] 3.15 Checkpoint - Test registration & payment flow
  - Test complete flow: register → payment → activation
  - Verify emails sent
  - Verify default store created
  - Ask the user if questions arise

### 4. Enhance Subscription Lifecycle Management

- [x] 4.1 Refactor subscription status check cron job
  - Update existing cron job (if exists) or create new one
  - Check subscriptions daily for expiry
  - Set status to 'expired' if end_date < current_date
  - Calculate and set grace_period_end_date (end_date + 3 days)
  - Set status to 'suspended' if grace_period_end_date < current_date
  - _Requirements: 4.3.2, 4.3.6_
  - _Note: Existing SubscriptionsService.checkExpiredSubscriptions() needs enhancement_

- [ ]* 4.2 Write property tests for subscription lifecycle
  - **Property 7: Expired Subscriptions Enter Grace Period**
  - **Property 10: Auto-Suspension After Grace Period**
  - **Validates: Requirements 4.3.2, 4.3.6**

- [x] 4.3 Implement grace period access control middleware
  - Create or enhance existing middleware
  - Check subscription status before each request
  - Allow GET requests for 'expired' status
  - Block POST/PUT/DELETE for 'expired' status
  - Return error with renewal link
  - _Requirements: 4.3.5_

- [ ]* 4.4 Write property tests for grace period
  - **Property 8: Grace Period Allows Read-Only Access**
  - **Validates: Requirements 4.3.5**

- [x] 4.5 Update login to check suspension
  - Enhance existing AuthService.login()
  - Check company subscription status
  - Block login if status is 'suspended'
  - Return suspension message with renewal link
  - _Requirements: 4.3.6_

- [ ]* 4.6 Write property tests for suspended login
  - **Property 9: Suspended Accounts Block Login**
  - **Validates: Requirements 4.3.6**

- [x] 4.7 Implement renewal notification system
  - Create NotificationService.sendRenewalReminder()
  - Create cron job to check subscriptions daily
  - Send notifications at -7, -3, -1, 0, +1, +2, +3 days
  - Track sent notifications in notifications table
  - Support multiple channels (email, in-app, SMS, WhatsApp)
  - _Requirements: 4.3.3_

- [ ]* 4.8 Write property tests for notifications
  - **Property 15: Renewal Notifications Timeline**
  - **Property 16: No Duplicate Notifications**
  - **Validates: Requirements 4.3.3**

- [x] 4.9 Implement subscription renewal API
  - Create SubscriptionController.renewSubscription()
  - Accept duration_months parameter
  - Calculate new end_date from current end_date (if active)
  - Generate invoice and redirect to payment
  - Update subscription after payment success
  - _Requirements: 4.3.4_

- [ ]* 4.10 Write property tests for renewal
  - **Property 11: Renewal Extends Subscription from Current End Date**
  - **Validates: Requirements 4.3.4**

- [x] 4.11 Implement reactivation for suspended accounts
  - Create SubscriptionsService.reactivateSubscription()
  - Calculate new start_date as current_date
  - Calculate new end_date from current_date + duration
  - Update status to 'active'
  - Restore full access
  - _Requirements: 4.3.7_

- [ ]* 4.12 Write property tests for reactivation
  - **Property 12: Reactivation Calculates from Today**
  - **Property 13: Reactivation Restores Full Access**
  - **Property 14: Suspended Data Persistence**
  - **Validates: Requirements 4.3.7**

- [x] 4.13 Enhance subscription history tracking
  - Update subscription_history table usage
  - Log all subscription changes
  - Provide API to view history
  - _Requirements: 4.3.8_

- [x] 4.14 Checkpoint - Test subscription lifecycle
  - Test expiry → grace period → suspension flow
  - Test renewal and reactivation
  - Verify notifications sent
  - Ask the user if questions arise

### 5. Enhance Company & Store Management

- [x] 5.1 Review and enhance existing CompaniesService
  - Review existing CRUD operations
  - Add missing fields if any (logo_url, tax_id, etc.)
  - Ensure validation is proper
  - _Requirements: 4.2.9_
  - _Note: CompaniesService already exists with basic functionality_

- [x] 5.2 Review existing company API endpoints
  - Verify existing endpoints work correctly
  - Add missing endpoints if needed
  - Update DTOs if required
  - _Requirements: 4.2.9_

- [x] 5.3 Review and enhance existing StoresService
  - Review existing CRUD operations
  - Ensure manager assignment works
  - Verify opening hours handling
  - Add any missing functionality
  - _Requirements: 4.2.2_
  - _Note: StoresService already exists_

- [x] 5.4 Review existing store API endpoints
  - Verify all CRUD endpoints work
  - Test pagination and filtering
  - Add missing endpoints if needed
  - _Requirements: 4.2.2_

- [ ]* 5.5 Write unit tests for company/store management
  - Test company profile updates
  - Test store CRUD operations
  - Test manager assignment
  - _Requirements: 4.2.2, 4.2.9_

### 6. Enhance Product Management

- [x] 6.1 Review and enhance existing CategoriesService
  - Review existing category CRUD
  - Verify nested categories work properly
  - Ensure sorting and images are handled
  - _Requirements: 4.2.3_
  - _Note: Categories module likely exists_

- [x] 6.2 Review existing category API endpoints
  - Verify tree structure endpoint works
  - Test all CRUD operations
  - Add missing endpoints if needed
  - _Requirements: 4.2.3_

- [x] 6.3 Review and enhance existing ProductsService
  - Review existing product CRUD
  - Verify variant handling works
  - Check SKU/barcode uniqueness enforcement
  - Ensure image handling is proper
  - Add any missing functionality
  - _Requirements: 4.2.3_
  - _Note: ProductsService already exists_

- [x] 6.4 Review and enhance product API endpoints
  - Verify pagination, filtering, search work
  - Test variant endpoints
  - Add bulk import/export if missing
  - _Requirements: 4.2.3_

- [ ]* 6.5 Write unit tests for product management
  - Test product CRUD with variants
  - Test SKU/barcode uniqueness
  - Test pricing calculations
  - Test bulk operations
  - _Requirements: 4.2.3_

- [x] 6.6 Checkpoint - Test product management
  - Test category hierarchy
  - Test product with variants
  - Test bulk import/export
  - Ask the user if questions arise

### 7. Enhance Inventory Management

- [x] 7.1 Review and enhance existing InventoryService
  - Review existing stock tracking implementation
  - Verify available_quantity calculation works
  - Ensure atomic updates are in place
  - Add any missing functionality
  - _Requirements: 4.2.4_
  - _Note: Inventory module likely exists_

- [x] 7.2 Enhance stock adjustment operations
  - Review existing adjustStock() method
  - Ensure inventory_movements logging works
  - Verify transaction atomicity
  - Add missing adjustment types if needed
  - _Requirements: 4.2.4_
  - _Status: ✅ COMPLETED - Fixed TypeScript null handling, verified all 6 movement types, confirmed atomic transactions and logging_

- [ ]* 7.3 Write property tests for stock adjustments
  - **Property 18: Stock Adjustment Updates Inventory**
  - **Validates: Requirements 4.2.4**

- [x] 7.4 Implement or enhance low stock alerts
  - Review existing implementation
  - Ensure min_stock threshold comparison works
  - Add notification if missing
  - _Requirements: 4.2.4_

- [x] 7.5 Implement or enhance stock transfer
  - Review existing transferStock() method
  - Ensure atomicity with transactions
  - Verify both stores are updated correctly
  - _Requirements: 4.2.4_

- [ ]* 7.6 Write property tests for stock transfer
  - **Property 19: Stock Transfer Conservation**
  - **Validates: Requirements 4.2.4**

- [x] 7.7 Review inventory API endpoints
  - Verify all endpoints work correctly
  - Test stock adjustment endpoint
  - Test stock transfer endpoint
  - Add missing endpoints if needed
  - _Requirements: 4.2.4_

- [ ]* 7.8 Write unit tests for inventory
  - Test stock adjustments
  - Test stock transfers
  - Test low stock alerts
  - Test concurrent updates
  - _Requirements: 4.2.4_

### 8. Enhance POS Transaction System

- [x] 8.1 Review and enhance transaction calculations
  - Review existing calculateTotal() logic
  - Verify item-level and transaction-level discounts work
  - Ensure tax calculations are correct
  - Add any missing calculation logic
  - _Requirements: 4.2.7_
  - _Note: TransactionsService likely exists_

- [ ]* 8.2 Write property tests for calculations
  - **Property 20: Transaction Total Calculation**
  - **Validates: Requirements 4.2.7**

- [x] 8.3 Review and enhance transaction creation
  - Review existing createTransaction() method
  - Verify transaction_number generation is unique
  - Ensure inventory reduction works
  - Verify loyalty points update (if implemented)
  - Ensure database transaction atomicity
  - _Requirements: 4.2.7_

- [ ]* 8.4 Write property tests for transactions
  - **Property 21: Split Payment Sum Equals Total**
  - **Property 24: Transaction Reduces Inventory**
  - **Validates: Requirements 4.2.7**

- [x] 8.5 Implement or enhance void/refund
  - Review existing void/refund logic
  - Ensure inventory restoration works
  - Verify void reason is logged
  - Add refund transaction creation if missing
  - _Requirements: 4.2.7_

- [ ]* 8.6 Write property tests for void
  - **Property 22: Void Transaction Restores Inventory**
  - **Validates: Requirements 4.2.7**

- [x] 8.7 Review transaction API endpoints
  - Verify all CRUD endpoints work
  - Test pagination and filtering
  - Test void and refund endpoints
  - Add receipt endpoint if missing
  - _Requirements: 4.2.7_

- [ ]* 8.8 Write unit tests for transactions
  - Test transaction with multiple items
  - Test split payment scenarios
  - Test void and refund flows
  - Test inventory updates
  - _Requirements: 4.2.7_

- [x] 8.9 Checkpoint - Test POS flow
  - Test complete transaction flow
  - Test void and refund
  - Verify inventory updates
  - Ask the user if questions arise

### 9. Enhance Customer Management

- [x] 9.1 Review and enhance existing CustomersService
  - Review existing CRUD operations
  - Verify customer_number generation is unique
  - Ensure purchase history tracking works
  - Add any missing functionality
  - _Requirements: 4.2.6_
  - _Note: CustomersService already exists_

- [x] 9.2 Review and enhance loyalty points system
  - Review existing loyalty points implementation
  - Verify addPoints() and redeemPoints() work
  - Ensure loyalty_point_transactions logging works
  - Add tier management if missing
  - _Requirements: 4.2.6_

- [ ]* 9.3 Write property tests for loyalty points
  - **Property 23: Loyalty Points Balance Consistency**
  - **Validates: Requirements 4.2.6**

- [x] 9.4 Review customer API endpoints
  - Verify all CRUD endpoints work
  - Test pagination and search
  - Test points add/redeem endpoints
  - Test purchase history endpoint
  - _Requirements: 4.2.6_

- [ ]* 9.5 Write unit tests for customers
  - Test customer CRUD
  - Test loyalty points earn/redeem
  - Test purchase history tracking
  - _Requirements: 4.2.6_

### 10. Enhance Employee Management

- [x] 10.1 Review and enhance existing EmployeesService
  - Review existing CRUD operations
  - Verify employee_number generation is unique
  - Ensure user account linking works
  - Verify store assignment works
  - _Requirements: 4.2.5_
  - _Note: EmployeesService already exists_

- [x] 10.2 Review and enhance clock in/out system
  - Review existing attendance tracking
  - Verify clock-in/out timestamps are recorded
  - Ensure work duration calculation works
  - Add break time tracking if missing
  - _Requirements: 4.3.4_

- [x] 10.3 Review employee API endpoints
  - Verify all CRUD endpoints work
  - Test clock-in/out endpoints
  - Test attendance history endpoint
  - Add missing endpoints if needed
  - _Requirements: 4.2.5, 4.3.4_

- [ ]* 10.4 Write unit tests for employees
  - Test employee CRUD
  - Test clock in/out functionality
  - Test attendance tracking
  - _Requirements: 4.2.5_

### 11. Enhance Reporting System

- [x] 11.1 Review and enhance sales report
  - Review existing getSalesReport() implementation
  - Verify date range filtering works
  - Ensure metrics calculations are correct
  - Add grouping by day/week/month if missing
  - _Requirements: 4.2.8_

- [x] 11.2 Review and enhance product performance report
  - Review existing getProductPerformance()
  - Verify top selling products calculation
  - Ensure revenue per product is correct
  - Add filtering options if missing
  - _Requirements: 4.2.8_

- [x] 11.3 Review and enhance inventory report
  - Review existing getInventoryReport()
  - Verify stock levels display correctly
  - Ensure low stock highlighting works
  - Add inventory value calculation if missing
  - _Requirements: 4.2.8_

- [x] 11.4 Review report API endpoints
  - Verify all report endpoints work
  - Test export functionality
  - Add missing endpoints if needed
  - _Requirements: 4.2.8_

- [ ]* 11.5 Write unit tests for reporting
  - Test sales calculations
  - Test product performance metrics
  - Test inventory reporting
  - Test date range filtering
  - _Requirements: 4.2.8_

### 12. Enhance Company Admin Dashboard

- [x] 12.1 Review and enhance member management
  - Review existing admin member management
  - Verify list/filter/search works
  - Ensure status updates work correctly
  - Add analytics if missing
  - _Requirements: 4.1.1_

- [x] 12.2 Review Company Admin API endpoints
  - Verify all admin endpoints work
  - Test member management operations
  - Test plan management
  - Add missing endpoints if needed
  - _Requirements: 4.1.1, 4.1.2_

- [ ]* 12.3 Write unit tests for Company Admin
  - Test member management
  - Test status updates
  - Test analytics calculations
  - _Requirements: 4.1.1_

- [x] 12.4 Checkpoint - Test Company Admin
  - Test member management
  - Test subscription plan management
  - Ask the user if questions arise

### 13. Enhance Member Admin Dashboard

- [x] 13.1 Review and enhance dashboard service
  - Review existing dashboard implementation
  - Verify metrics calculations are correct
  - Ensure chart data generation works
  - Add missing metrics if needed
  - _Requirements: 4.2.1_

- [x] 13.2 Review dashboard API endpoint
  - Verify dashboard endpoint works
  - Test all metrics are returned correctly
  - Add missing data if needed
  - _Requirements: 4.2.1_

- [ ]* 13.3 Write unit tests for dashboard
  - Test metrics calculations
  - Test date range filtering
  - Test multi-store aggregation
  - _Requirements: 4.2.1_

### 14. Enhance Audit Logging

- [x] 14.1 Review and enhance audit logging
  - Review existing AuditService implementation
  - Verify all important actions are logged
  - Ensure old/new values are captured
  - Add missing audit points if needed
  - _Requirements: 6.2_
  - _Note: Audit module likely exists_

- [x] 14.2 Review audit log API endpoints
  - Verify list endpoint works with filters
  - Test pagination
  - Add missing endpoints if needed
  - _Requirements: 6.2_

- [ ]* 14.3 Write unit tests for audit logging
  - Test log creation for various actions
  - Test filtering and searching
  - _Requirements: 6.2_

### 15. Enhance Error Handling & Monitoring

- [x] 15.1 Review and enhance global exception filter
  - Review existing HttpExceptionFilter
  - Ensure consistent error response format
  - Verify all error types are handled
  - Add missing error handlers if needed
  - _Requirements: 6.2_
  - _Note: Exception filter likely exists in common/filters_

- [x] 15.2 Review and enhance logging interceptor
  - Review existing LoggingInterceptor
  - Verify request/response logging works
  - Ensure sensitive data is not logged
  - Add missing logging points if needed
  - _Requirements: 6.2_

- [x] 15.3 Set up or enhance error monitoring
  - Review existing error monitoring setup
  - Configure Sentry or similar if not exists
  - Set up alerts for critical errors
  - _Requirements: 6.2_

- [ ]* 15.4 Write unit tests for error handling
  - Test exception filter responses
  - Test logging interceptor
  - _Requirements: 6.2_

### 16. Refactor & Enhance Company Admin Frontend

- [x] 16.1 Review existing Company Admin frontend
  - Review existing Next.js setup (Port 4402)
  - Verify authentication works
  - Check API client configuration
  - Identify what needs to be refactored
  - _Requirements: 2.1_
  - _Note: Company Admin frontend already exists_

- [x] 16.2 Enhance authentication pages
  - Review existing login page
  - Update if needed for new auth flow
  - Ensure JWT token handling works
  - Verify protected routes work
  - _Requirements: 3.1_

- [x] 16.3 Enhance member management pages
  - Review existing member management UI
  - Update to show subscription details
  - Add status management controls
  - Improve filters and search
  - _Requirements: 4.1.1_

- [x] 16.4 Enhance subscription plan management
  - Review existing plan management UI
  - Add duration pricing configuration
  - Update plan creation/edit forms
  - _Requirements: 4.1.2_

- [x] 16.5 Enhance analytics dashboard
  - Review existing dashboard
  - Update metrics display
  - Add missing charts if needed
  - Improve data visualization
  - _Requirements: 4.1.5_

### 17. Refactor & Enhance Member Admin Frontend

- [x] 17.1 Review existing Member Admin frontend
  - Review existing Next.js setup (Port 4403)
  - Verify authentication works
  - Check tenant context (company_id) handling
  - Identify what needs to be refactored
  - _Requirements: 2.1_
  - _Note: Member Admin frontend already exists_

- [x] 17.2 Create or enhance registration & payment pages
  - Create registration page with plan selection
  - Integrate payment gateway UI (Midtrans)
  - Handle payment redirect and callback
  - Update login page if needed
  - _Requirements: 4.1.1_

- [x] 17.3 Enhance dashboard page
  - Review existing dashboard
  - Update metrics display
  - Add subscription status banner
  - Improve charts and quick actions
  - _Requirements: 4.2.1_

- [x] 17.4 Create subscription management pages
  - Create subscription details page
  - Create renewal page with duration selection
  - Create subscription history page
  - Create invoice list with download
  - _Requirements: 4.3.4, 4.3.8_

- [x] 17.5 Review and enhance product management pages
  - Review existing product pages
  - Update if needed for variants
  - Ensure bulk import/export works
  - Improve UI/UX if needed
  - _Requirements: 4.2.3_

- [x] 17.6 Review and enhance category management
  - Review existing category pages
  - Ensure tree view works
  - Update UI if needed
  - _Requirements: 4.2.3_

- [x] 17.7 Review and enhance inventory pages
  - Review existing inventory UI
  - Update stock adjustment forms
  - Ensure stock transfer works
  - Add low stock alerts display
  - _Requirements: 4.2.4_

- [x] 17.8 Review and enhance POS transaction page
  - Review existing POS UI
  - Ensure product search works
  - Verify cart functionality
  - Test payment methods
  - Improve receipt preview
  - _Requirements: 4.2.7_

- [x] 17.9 Review and enhance customer pages
  - Review existing customer management
  - Ensure loyalty points UI works
  - Update purchase history display
  - _Requirements: 4.2.6_

- [x] 17.10 Review and enhance employee pages
  - Review existing employee management
  - Ensure attendance tracking works
  - Update clock in/out interface
  - _Requirements: 4.2.5_

- [x] 17.11 Review and enhance store pages
  - Review existing store management
  - Update forms if needed
  - Ensure multi-store works
  - _Requirements: 4.2.2_

- [x] 17.12 Review and enhance reporting pages
  - Review existing reports
  - Update date range pickers
  - Ensure export works
  - Add missing reports
  - _Requirements: 4.2.8_

- [x] 17.13 Review and enhance settings pages
  - Review existing settings
  - Add missing settings sections
  - Update forms if needed
  - _Requirements: 4.2.9_

- [x] 17.14 Implement subscription status banners
  - Create expiring soon banner
  - Create expired banner with grace period countdown
  - Create suspended banner with renewal link
  - _Requirements: 4.3.2, 4.3.5, 4.3.6_

- [x] 17.15 Checkpoint - Test Member Admin UI
  - Test all pages render correctly
  - Test complete user flows
  - Test responsive design
  - Ask the user if questions arise

### 18. Integration Testing & Bug Fixes

- [x] 18.1 Perform end-to-end testing
  - Test complete registration → payment → activation flow
  - Test subscription lifecycle (expiry, grace period, suspension, renewal)
  - Test POS transaction with inventory updates
  - Test multi-store operations
  - Test customer loyalty flow
  - _Requirements: All_

- [x] 18.2 Fix identified bugs and issues
  - Address any bugs found during testing
  - Optimize slow queries
  - Fix UI/UX issues
  - _Requirements: All_


- [x] 18.3 Final checkpoint - Phase 1 MVP complete
  - All core features implemented and tested
  - All critical bugs fixed
  - System ready for beta testing
  - Ask the user if questions arise

---

## Phase 2: Enhancement (Industry-Specific & Advanced Features)

### 19. POS Payment Methods (Configurable per Tenant)

- [x] 19.1 Create PaymentMethod entity and module
  - Create payment-methods module with entity, service, controller
  - Implement CRUD operations for payment methods
  - Add seeder for default payment methods
  - Create API endpoints for managing payment methods
  - _Requirements: 4.2.7_
  - _Note: Migration already created in 1711659969000-CreatePaymentMethodsTable.ts_

- [x] 19.2 Create Member Admin UI for payment methods
  - Create settings page for managing payment methods
  - Update POS page to use configured payment methods
  - _Requirements: 4.2.7_

- [x] 19.3 Apply migration and test
  - Run migration to create payment_methods table
  - Test CRUD operations
  - Verify default payment methods seeded
  - _Requirements: 4.2.7_

### 20. Xendit Payment Integration

- [x] 20.1 Integrate Xendit payment gateway
  - Install and configure Xendit SDK
  - Implement invoice creation
  - Handle payment notification webhook
  - Verify webhook signature
  - Support multiple payment methods (card, bank transfer, e-wallet, QRIS)
  - _Requirements: 4.1.2_
  - _Status: ✅ COMPLETE (1 April 2026)_

- [x] 20.2 Create payment gateway selection
  - Allow member to choose payment gateway (Midtrans or Xendit)
  - Store preference in company settings
  - Route payments to selected gateway
  - Create frontend UI for gateway selection
  - _Requirements: 4.1.2_
  - _Status: ✅ COMPLETE (1 April 2026)_

- [ ]* 20.3 Write unit tests for Xendit integration
  - Test invoice creation
  - Test webhook handling
  - Test signature verification
  - _Requirements: 4.1.2_

### 21. Add-ons Marketplace

- [ ] 21.1 Implement add-ons management (Company Admin)
  - Create AddOnsService with CRUD operations
  - Define add-on categories (integration, feature, support, capacity)
  - Set pricing (one-time or recurring)
  - Set availability per plan
  - _Requirements: 4.2.1_


- [ ] 21.2 Implement add-on purchase flow
  - Create CompanyAddOnsService
  - Implement purchase add-on method
  - Generate invoice for add-on
  - Redirect to payment gateway
  - Activate add-on after payment success
  - _Requirements: 4.2.2_

- [ ]* 21.3 Write property tests for add-on activation
  - **Property 17: Add-on Activation After Payment**
  - **Validates: Requirements 4.2.2**

- [ ] 21.4 Create add-ons API endpoints
  - GET /api/addons - List available add-ons
  - GET /api/addons/purchased - List purchased add-ons
  - POST /api/addons/:id/purchase - Purchase add-on
  - POST /api/addons/:id/cancel - Cancel add-on subscription
  - _Requirements: 4.2.2_

- [ ] 20.5 Create add-ons marketplace UI (Member Admin)
  - Available add-ons page with cards
  - My add-ons page
  - Add-on details modal
  - Purchase flow UI
  - _Requirements: 4.2.5_

### 21. Advanced Inventory Features

- [ ] 21.1 Implement supplier management
  - Create SuppliersService with CRUD operations
  - Track supplier information (name, contact, address)
  - Link products to suppliers
  - _Requirements: 5.3_


- [ ] 21.2 Implement purchase orders
  - Create PurchaseOrdersService
  - Create purchase order with items
  - Track PO status (draft, sent, received, cancelled)
  - Receive PO and update inventory
  - _Requirements: 5.3_

- [ ] 21.3 Implement stock opname (stock taking)
  - Create recordStockOpname() method
  - Compare physical count with system count
  - Generate adjustment records
  - Track discrepancies
  - _Requirements: 4.2.4_

- [ ] 21.4 Create advanced inventory API endpoints
  - GET /api/suppliers - List suppliers
  - POST /api/suppliers - Create supplier
  - GET /api/purchase-orders - List purchase orders
  - POST /api/purchase-orders - Create purchase order
  - POST /api/purchase-orders/:id/receive - Receive PO
  - POST /api/inventory/opname - Record stock taking
  - _Requirements: 5.3, 4.2.4_

- [ ] 21.5 Create advanced inventory UI pages
  - Suppliers management page
  - Purchase orders page
  - Stock opname page
  - _Requirements: 5.3, 4.2.4_

### 22. Customer Loyalty System Enhancement

- [ ] 22.1 Implement customer tiers
  - Add loyalty_tier field (regular, silver, gold, platinum)
  - Define tier thresholds based on total_spent
  - Auto-upgrade customer tier
  - Apply tier-based benefits (discounts, points multiplier)
  - _Requirements: 4.2.6_


- [ ] 22.2 Implement birthday and anniversary reminders
  - Create cron job to check upcoming birthdays
  - Queue notification for birthdays
  - Track customer anniversaries (first purchase date)
  - _Requirements: 4.2.6_

- [ ] 22.3 Create customer loyalty UI enhancements
  - Display customer tier badge
  - Show tier benefits
  - Birthday/anniversary reminders list
  - _Requirements: 4.2.6_

### 23. Advanced Reporting & Analytics

- [ ] 23.1 Implement employee performance report
  - Create getEmployeePerformance() method
  - Track sales per employee
  - Calculate average transaction value per employee
  - Track attendance and work hours
  - _Requirements: 4.2.8_

- [ ] 23.2 Implement customer report
  - Create getCustomerReport() method
  - Track new vs returning customers
  - Calculate customer lifetime value
  - Identify top customers
  - _Requirements: 4.2.8_

- [ ] 23.3 Implement profit/loss report
  - Calculate profit (revenue - cost)
  - Track expenses
  - Generate P&L statement
  - Support date range filtering
  - _Requirements: 4.2.8_


- [ ] 23.4 Create advanced reporting API endpoints
  - GET /api/reports/employees - Employee performance report
  - GET /api/reports/customers - Customer report
  - GET /api/reports/profit-loss - P&L report
  - _Requirements: 4.2.8_

- [ ] 23.5 Create advanced reporting UI pages
  - Employee performance report page
  - Customer analytics page
  - Profit/loss report page
  - _Requirements: 4.2.8_

### 24. FnB Specific Features

- [ ] 24.1 Implement table management
  - Create TablesService with CRUD operations
  - Track table status (available, occupied, reserved, cleaning)
  - Support floor and section organization
  - Link table to current transaction
  - _Requirements: 5.1_

- [ ] 24.2 Implement order types
  - Add order_type field (dine-in, takeaway, delivery)
  - Create FnbOrdersService
  - Track order status (pending, preparing, ready, served, completed)
  - Support delivery address and fee
  - _Requirements: 5.1_

- [ ] 24.3 Implement kitchen display system (KDS)
  - Create API for kitchen display
  - Show pending orders by status
  - Allow kitchen to update order status
  - Real-time updates (WebSocket or polling)
  - _Requirements: 5.1_


- [ ] 24.4 Implement menu modifiers
  - Add product modifiers (extra cheese, no onion, etc.)
  - Support modifier pricing
  - Apply modifiers to transaction items
  - _Requirements: 5.1_

- [ ] 24.5 Implement split bill
  - Allow splitting transaction by items
  - Allow splitting transaction by amount
  - Generate separate receipts
  - _Requirements: 5.1_

- [ ] 24.6 Create FnB API endpoints
  - GET /api/fnb/tables - List tables
  - POST /api/fnb/tables - Create table
  - PUT /api/fnb/tables/:id/status - Update table status
  - GET /api/fnb/orders - List orders
  - POST /api/fnb/orders - Create order
  - PUT /api/fnb/orders/:id/status - Update order status
  - GET /api/fnb/kitchen-display - Get orders for kitchen
  - _Requirements: 5.1_

- [ ] 24.7 Create FnB UI pages
  - Table management page with floor plan
  - Order management page
  - Kitchen display screen
  - Menu modifiers configuration
  - _Requirements: 5.1_

### 25. Laundry Specific Features

- [ ] 25.1 Implement laundry service types
  - Define service types (wash_dry, wash_iron, dry_clean, iron_only)
  - Set pricing per kg or per item
  - _Requirements: 5.2_


- [ ] 25.2 Implement laundry order tracking
  - Create LaundryOrdersService
  - Track order status (received, washing, drying, ironing, ready, delivered)
  - Generate unique order number
  - Track weight and item count
  - _Requirements: 5.2_

- [ ] 25.3 Implement item checklist
  - Create LaundryItemsService
  - Track individual items (shirt, pants, dress, etc.)
  - Support barcode tagging per item
  - _Requirements: 5.2_

- [ ] 25.4 Implement pickup and delivery schedule
  - Add pickup_date and delivery_date fields
  - Track scheduled pickups and deliveries
  - Send reminders for pickup/delivery
  - _Requirements: 5.2_

- [ ] 25.5 Create laundry API endpoints
  - GET /api/laundry/orders - List laundry orders
  - POST /api/laundry/orders - Create laundry order
  - GET /api/laundry/orders/:id - Get order details
  - PUT /api/laundry/orders/:id/status - Update order status
  - POST /api/laundry/orders/:id/items - Add items to order
  - GET /api/laundry/schedule - Get pickup/delivery schedule
  - _Requirements: 5.2_

- [ ] 25.6 Create laundry UI pages
  - Laundry order creation page
  - Order tracking page with status timeline
  - Item checklist page
  - Pickup/delivery schedule page
  - _Requirements: 5.2_


### 26. Discount & Promotion System

- [ ] 26.1 Implement discount management
  - Create DiscountsService with CRUD operations
  - Support percentage and fixed amount discounts
  - Set minimum purchase amount
  - Set maximum discount amount
  - Define applicable scope (all, category, product)
  - Track usage limit and count
  - _Requirements: 4.2.7_

- [ ] 26.2 Implement promo codes
  - Generate unique promo codes
  - Validate promo code at checkout
  - Apply discount based on promo code
  - Track promo code usage
  - _Requirements: 4.2.7_

- [ ] 26.3 Create discount API endpoints
  - GET /api/discounts - List discounts
  - POST /api/discounts - Create discount
  - PUT /api/discounts/:id - Update discount
  - DELETE /api/discounts/:id - Delete discount
  - POST /api/discounts/validate - Validate promo code
  - _Requirements: 4.2.7_

- [ ] 26.4 Create discount UI pages
  - Discounts list page
  - Create/edit discount form
  - Promo code generator
  - _Requirements: 4.2.7_

- [ ] 26.5 Checkpoint - Phase 2 complete
  - All enhancement features implemented
  - Industry-specific features tested
  - Ask the user if questions arise


---

## Phase 3: Mobile & Integration

### 27. Flutter Mobile POS App

- [ ] 27.1 Set up Flutter project
  - Initialize Flutter project
  - Configure dependencies (http, provider/bloc, shared_preferences)
  - Set up folder structure (features, core, shared)
  - Configure API client
  - _Requirements: 2.1, 4.3_

- [ ] 27.2 Implement mobile authentication
  - Create login screen
  - Implement PIN login (4-6 digit)
  - Implement biometric authentication (fingerprint/face ID)
  - Store JWT token securely
  - Implement auto-logout after idle
  - _Requirements: 4.3.1_

- [ ] 27.3 Implement mobile POS transaction screen
  - Create product search and selection UI
  - Implement barcode scanner
  - Create shopping cart UI
  - Implement quantity adjustment
  - Apply discounts
  - Select customer
  - _Requirements: 4.3.2_

- [ ] 27.4 Implement mobile payment processing
  - Support multiple payment methods
  - Implement split payment UI
  - Generate receipt
  - Print receipt via Bluetooth printer
  - Email receipt option
  - _Requirements: 4.3.2_


- [ ] 27.5 Implement offline mode
  - Set up local database (SQLite/Hive)
  - Sync data when online (products, customers, inventory)
  - Queue transactions when offline
  - Auto-sync when connection restored
  - Handle conflict resolution
  - _Requirements: 4.3.3_

- [ ] 27.6 Implement shift management in mobile
  - Create clock in/out screen
  - Track break time
  - Display shift summary
  - Manage cash drawer (opening/closing balance)
  - _Requirements: 4.3.4_

- [ ] 27.7 Implement transaction history in mobile
  - List recent transactions
  - View transaction details
  - Void transaction (with permission)
  - _Requirements: 4.3.2_

- [ ]* 27.8 Write unit tests for mobile app
  - Test authentication flow
  - Test transaction calculations
  - Test offline sync logic
  - _Requirements: 4.3_

### 28. WhatsApp Notification Integration

- [ ] 28.1 Integrate WhatsApp Business API
  - Set up WhatsApp Business account
  - Configure webhook for incoming messages
  - Implement message sending service
  - _Requirements: 6.4_


- [ ] 28.2 Implement WhatsApp notifications
  - Send subscription renewal reminders
  - Send order status updates (for laundry)
  - Send pickup/delivery reminders
  - Send promotional messages
  - _Requirements: 6.4_

- [ ] 28.3 Create WhatsApp notification settings
  - Allow member to enable/disable WhatsApp notifications
  - Configure notification templates
  - _Requirements: 6.4_

### 29. Accounting Software Integration

- [ ] 29.1 Integrate with Jurnal.id
  - Set up Jurnal API credentials
  - Implement sync service
  - Sync transactions to Jurnal
  - Sync expenses to Jurnal
  - Map accounts and categories
  - _Requirements: 6.4_

- [ ] 29.2 Integrate with Accurate Online
  - Set up Accurate API credentials
  - Implement sync service
  - Sync transactions to Accurate
  - Sync expenses to Accurate
  - Map accounts and categories
  - _Requirements: 6.4_

- [ ] 29.3 Create accounting integration UI
  - Integration settings page
  - Account mapping configuration
  - Sync status and history
  - Manual sync trigger
  - _Requirements: 6.4_


### 30. Delivery App Integration

- [ ] 30.1 Integrate with GoFood
  - Set up GoFood merchant API
  - Receive orders from GoFood
  - Update order status to GoFood
  - Sync menu items
  - _Requirements: 5.1_

- [ ] 30.2 Integrate with GrabFood
  - Set up GrabFood merchant API
  - Receive orders from GrabFood
  - Update order status to GrabFood
  - Sync menu items
  - _Requirements: 5.1_

- [ ] 30.3 Create delivery integration UI
  - Delivery orders dashboard
  - Order status management
  - Menu sync configuration
  - _Requirements: 5.1_

### 31. Email Service Integration

- [ ] 31.1 Integrate SendGrid or AWS SES
  - Configure email service credentials
  - Create email templates (welcome, invoice, renewal reminder, etc.)
  - Implement email sending service
  - Track email delivery status
  - _Requirements: 6.4_

- [ ] 31.2 Implement email queue processing
  - Process queued emails with Bull
  - Retry failed emails
  - Log email sending history
  - _Requirements: 6.4_


### 32. SMS Gateway Integration

- [ ] 32.1 Integrate SMS gateway (Twilio or local provider)
  - Configure SMS service credentials
  - Implement SMS sending service
  - Track SMS delivery status
  - _Requirements: 6.4_

- [ ] 32.2 Implement SMS notifications
  - Send OTP for verification
  - Send order status updates
  - Send payment reminders
  - _Requirements: 6.4_

- [ ] 32.3 Checkpoint - Phase 3 complete
  - Mobile app tested and working
  - All integrations functional
  - Ask the user if questions arise

---

## Phase 4: Scale & Optimize

### 33. Performance Optimization

- [ ] 33.1 Implement database query optimization
  - Add missing indexes
  - Optimize slow queries
  - Implement query result caching
  - Use database query profiling
  - _Requirements: 6.1, 6.3_

- [ ] 33.2 Implement API response caching
  - Cache frequently accessed data (products, categories, plans)
  - Implement cache invalidation strategies
  - Use Redis for caching
  - _Requirements: 6.1, 6.3_


- [ ] 33.3 Implement CDN for static assets
  - Configure CloudFlare CDN
  - Upload static assets (images, CSS, JS) to CDN
  - Update URLs to use CDN
  - _Requirements: 6.3_

- [ ] 33.4 Implement load balancing
  - Set up load balancer (AWS ALB or Nginx)
  - Configure multiple API instances
  - Implement health checks
  - _Requirements: 6.3_

- [ ] 33.5 Perform load testing
  - Use k6 or Artillery for load testing
  - Simulate 1000+ concurrent users
  - Identify bottlenecks
  - Optimize based on results
  - _Requirements: 6.1_

### 34. Multi-Language Support

- [ ] 34.1 Implement i18n in backend
  - Set up i18n library (i18next)
  - Create translation files (ID, EN)
  - Translate error messages
  - Translate email templates
  - _Requirements: 7.1_

- [ ] 34.2 Implement i18n in frontend
  - Set up i18n library (next-i18next)
  - Create translation files (ID, EN)
  - Translate all UI text
  - Add language switcher
  - _Requirements: 7.1_


- [ ] 34.3 Implement i18n in mobile app
  - Set up i18n library (flutter_localizations)
  - Create translation files (ID, EN)
  - Translate all UI text
  - Add language switcher
  - _Requirements: 7.1_

### 35. Advanced Analytics

- [ ] 35.1 Implement predictive analytics
  - Forecast sales trends
  - Predict inventory needs
  - Identify at-risk customers (churn prediction)
  - _Requirements: 4.2.8_

- [ ] 35.2 Implement cohort analysis
  - Track customer cohorts by signup date
  - Calculate retention rates
  - Analyze cohort behavior
  - _Requirements: 4.2.8_

- [ ] 35.3 Implement RFM analysis
  - Calculate Recency, Frequency, Monetary scores
  - Segment customers by RFM
  - Identify high-value customers
  - _Requirements: 4.2.8_

- [ ] 35.4 Create advanced analytics UI
  - Predictive analytics dashboard
  - Cohort analysis page
  - RFM segmentation page
  - _Requirements: 4.2.8_

### 36. Auto-Renewal System

- [ ] 36.1 Implement saved payment methods
  - Store payment method tokens securely
  - Support credit card tokenization
  - Allow member to manage saved payment methods
  - _Requirements: 4.3.9_


- [ ] 36.2 Implement auto-renewal logic
  - Create cron job to check subscriptions 3 days before expiry
  - Auto-charge saved payment method
  - Handle payment failure (retry 3 times)
  - Send notifications before auto-charge
  - Allow member to cancel auto-renewal
  - _Requirements: 4.3.9_

- [ ] 36.3 Create auto-renewal UI
  - Enable/disable auto-renewal toggle
  - Manage saved payment methods
  - View auto-renewal history
  - _Requirements: 4.3.9_

### 37. API for Third-Party Integration

- [ ] 37.1 Create public API documentation
  - Document all public API endpoints
  - Create API reference with examples
  - Publish API documentation (Swagger/OpenAPI)
  - _Requirements: 11_

- [ ] 37.2 Implement API key management
  - Generate API keys for members
  - Implement API key authentication
  - Track API usage per key
  - Set rate limits per key
  - _Requirements: 11_

- [ ] 37.3 Create API management UI
  - API keys management page
  - API usage dashboard
  - API documentation link
  - _Requirements: 11_


### 38. Security Enhancements

- [ ] 38.1 Implement rate limiting
  - Add rate limiting middleware (100 requests/minute per IP)
  - Configure different limits for different endpoints
  - Return 429 Too Many Requests when exceeded
  - _Requirements: 6.2_

- [ ] 38.2 Implement CSRF protection
  - Add CSRF token generation
  - Validate CSRF token for state-changing operations
  - _Requirements: 6.2_

- [ ] 38.3 Implement security headers
  - Add helmet middleware for security headers
  - Configure CORS properly
  - Set Content-Security-Policy
  - _Requirements: 6.2_

- [ ] 38.4 Perform security audit
  - Run security scanning tools (OWASP ZAP, Snyk)
  - Fix identified vulnerabilities
  - Implement security best practices
  - _Requirements: 6.2_

### 39. Backup & Disaster Recovery

- [ ] 39.1 Implement automated database backups
  - Configure daily automated backups
  - Store backups in S3 or similar
  - Implement backup retention policy (30 days)
  - _Requirements: 7.2_


- [ ] 39.2 Implement backup restoration testing
  - Test backup restoration process
  - Document restoration procedures
  - Create disaster recovery runbook
  - _Requirements: 7.2_

- [ ] 39.3 Implement point-in-time recovery
  - Enable MySQL binary logging
  - Configure point-in-time recovery
  - Test recovery process
  - _Requirements: 7.2_

### 40. Monitoring & Alerting

- [ ] 40.1 Set up application monitoring
  - Integrate DataDog or New Relic for APM
  - Monitor API response times
  - Track error rates
  - Monitor database performance
  - _Requirements: 7.2_

- [ ] 40.2 Set up infrastructure monitoring
  - Monitor server CPU, memory, disk usage
  - Monitor database connections
  - Monitor Redis performance
  - Set up health check endpoints
  - _Requirements: 7.2_

- [ ] 40.3 Configure alerting
  - Set up alerts for critical errors
  - Alert on high error rates
  - Alert on slow API responses
  - Alert on high resource usage
  - Configure alert channels (email, Slack, PagerDuty)
  - _Requirements: 7.2_


### 41. CI/CD Pipeline

- [ ] 41.1 Set up GitHub Actions for backend
  - Configure automated testing on PR
  - Run linting and type checking
  - Build Docker image
  - Deploy to staging on merge to develop
  - Deploy to production on merge to main
  - _Requirements: 7.3_

- [ ] 41.2 Set up GitHub Actions for frontend
  - Configure automated testing on PR
  - Run linting and type checking
  - Build and deploy to Vercel/Netlify
  - _Requirements: 7.3_

- [ ] 41.3 Set up GitHub Actions for mobile
  - Configure automated testing on PR
  - Build APK/IPA on release
  - Deploy to TestFlight/Play Store beta
  - _Requirements: 7.3_

### 42. Documentation

- [ ] 42.1 Create user documentation
  - Write user guide for Member Admin
  - Create video tutorials
  - Document common workflows
  - Create FAQ
  - _Requirements: 12_

- [ ] 42.2 Create developer documentation
  - Document architecture and design decisions
  - Create API documentation
  - Document database schema
  - Create contribution guide
  - _Requirements: 7.3_


- [ ] 42.3 Create admin documentation
  - Document Company Admin workflows
  - Create troubleshooting guide
  - Document support procedures
  - _Requirements: 12_

### 43. Final Testing & Launch Preparation

- [ ] 43.1 Perform comprehensive testing
  - Run all unit tests
  - Run all property-based tests
  - Run all integration tests
  - Perform end-to-end testing
  - _Requirements: 7.3_

- [ ] 43.2 Perform user acceptance testing
  - Recruit beta testers
  - Gather feedback
  - Fix critical issues
  - _Requirements: 8.1_

- [ ] 43.3 Perform security penetration testing
  - Hire security expert or use automated tools
  - Fix identified vulnerabilities
  - Re-test after fixes
  - _Requirements: 6.2_

- [ ] 43.4 Optimize for production
  - Enable production mode
  - Configure production environment variables
  - Set up SSL certificates
  - Configure domain names
  - _Requirements: 6.1_


- [ ] 43.5 Create launch checklist
  - Verify all features working
  - Verify all integrations configured
  - Verify monitoring and alerting active
  - Verify backups configured
  - Verify documentation complete
  - _Requirements: All_

- [ ] 43.6 Final checkpoint - Production ready
  - All phases complete
  - All tests passing
  - System optimized and secure
  - Ready for production launch
  - Ask the user if questions arise

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster delivery
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at key milestones
- All tasks assume TypeScript implementation (NestJS backend, Next.js frontend, Flutter mobile)

---

**Document Status**: Complete  
**Last Updated**: 28 Maret 2026  
**Ready for**: Implementation

