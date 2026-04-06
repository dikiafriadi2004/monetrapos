# Implementation Plan: Admin-Member Separation

## Overview

Memisahkan autentikasi super admin platform dari member/owner bisnis dengan membuat tabel `admin_users` terpisah, `AdminAuthModule` baru, dan memperbarui semua guard serta referensi `company_admin` di seluruh codebase.

## Tasks

- [x] 1. Buat AdminUser entity dan migration tabel admin_users
  - [x] 1.1 Buat file `apps/api/src/modules/admin-auth/admin-user.entity.ts`
    - Definisikan enum `AdminRole { SUPER_ADMIN = 'super_admin', ADMIN = 'admin' }`
    - Buat class `AdminUser extends BaseEntity` dengan kolom: `name`, `email`, `passwordHash`, `role`, `isActive`, `lastLoginAt`, `lastLoginIp`, `twoFactorEnabled`, `twoFactorSecret`, `deletedAt`
    - Tidak ada relasi ke `Company` atau `User`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Buat TypeORM migration `apps/api/src/migrations/1711659979000-CreateAdminUsersTable.ts`
    - `up()`: CREATE TABLE `admin_users` dengan semua kolom, UNIQUE constraint pada `email`, index pada `is_active`
    - `down()`: DROP TABLE `admin_users`
    - _Requirements: 1.1, 1.3, 1.4, 6.1, 6.6_

- [x] 2. Buat AdminAuthModule dengan semua komponen autentikasi admin
  - [x] 2.1 Buat `apps/api/src/modules/admin-auth/strategies/jwt-admin.strategy.ts`
    - Extend `PassportStrategy(Strategy, 'jwt-admin')`
    - Method `validate(payload)`: lempar `UnauthorizedException` jika `payload.type !== 'admin'`
    - Return `{ id: payload.sub, email: payload.email, type: 'admin', role: payload.role }`
    - _Requirements: 3.3, 3.5, 4.3_

  - [ ]* 2.2 Tulis property test untuk JwtAdminStrategy (Property 4)
    - **Property 4: Admin strategy menolak semua non-admin token**
    - **Validates: Requirements 3.3**
    - Gunakan `fc.string().filter(t => t !== 'admin')` untuk generate berbagai nilai `type`
    - Verifikasi `validate()` selalu throw `UnauthorizedException` untuk semua non-admin type

  - [x] 2.3 Buat `apps/api/src/modules/admin-auth/guards/admin-jwt.guard.ts`
    - `AdminJwtGuard extends AuthGuard('jwt-admin')`
    - _Requirements: 3.5, 4.1, 4.3_

  - [x] 2.4 Buat `apps/api/src/modules/admin-auth/admin-auth.service.ts`
    - Method `login(dto: LoginDto)`: query HANYA ke `admin_users`, bcrypt compare, update `lastLoginAt` + `lastLoginIp`, issue JWT dengan `type: 'admin'`
    - Method `getMe(adminId: string)`: return data dari `admin_users` tanpa field `company`/`companyId`
    - Method `generateToken(admin: AdminUser)`: sign JWT dengan payload `{ sub, email, type: 'admin', role }`
    - Method `hashPassword(password: string)`: bcrypt hash dengan cost factor 10
    - Jika email tidak ditemukan atau password salah: throw `UnauthorizedException('Invalid credentials')`
    - Jika `is_active = false`: throw `UnauthorizedException('Account is deactivated')`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 3.1, 5.7, 8.3_

  - [ ]* 2.5 Tulis property test untuk AdminAuthService (Property 1)
    - **Property 1: Admin login hanya query admin_users**
    - **Validates: Requirements 2.1, 2.5**
    - Mock `adminUserRepo.findOne`, verifikasi `userRepo.findOne` tidak pernah dipanggil untuk semua input credentials

  - [ ]* 2.6 Tulis property test untuk AdminAuthService (Property 2)
    - **Property 2: Admin JWT selalu mengandung type 'admin'**
    - **Validates: Requirements 3.1**
    - Untuk setiap `AdminUser` arbitrary, verifikasi token yang dihasilkan selalu memiliki `payload.type === 'admin'` dan `payload.sub === adminUser.id`

  - [ ]* 2.7 Tulis property test untuk AdminAuthService (Property 8)
    - **Property 8: Password admin selalu di-hash dengan bcrypt cost >= 10**
    - **Validates: Requirements 5.7**
    - Untuk setiap password string, verifikasi `bcrypt.getRounds(hash) >= 10`

  - [ ]* 2.8 Tulis property test untuk AdminAuthService (Property 9)
    - **Property 9: Successful admin login selalu memperbarui last_login_at**
    - **Validates: Requirements 2.6**
    - Catat timestamp sebelum login, verifikasi `lastLoginAt >= before` setelah login berhasil

  - [x] 2.9 Buat `apps/api/src/modules/admin-auth/admin-auth.controller.ts`
    - `POST /admin/auth/login` — public, delegasi ke `AdminAuthService.login()`
    - `GET /admin/auth/me` — dilindungi `AdminJwtGuard`, delegasi ke `AdminAuthService.getMe(req.user.id)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.3_

  - [x] 2.10 Buat `apps/api/src/modules/admin-auth/admin-auth.module.ts`
    - Import `TypeOrmModule.forFeature([AdminUser])`, `PassportModule`, `JwtModule.registerAsync`
    - Providers: `AdminAuthService`, `JwtAdminStrategy`
    - Controllers: `AdminAuthController`
    - Exports: `AdminAuthService`, `JwtModule`, `AdminJwtGuard`
    - _Requirements: 2.1_

- [x] 3. Buat JwtMemberStrategy dan MemberJwtGuard
  - [x] 3.1 Buat `apps/api/src/modules/auth/strategies/jwt-member.strategy.ts`
    - Extend `PassportStrategy(Strategy, 'jwt-member')`
    - Method `validate(payload)`: lempar `UnauthorizedException` jika `payload.type !== 'member'` dan `payload.type !== 'employee'`
    - Return objek user yang sama seperti `JwtStrategy` yang ada saat ini
    - _Requirements: 3.2, 3.4, 3.6_

  - [ ]* 3.2 Tulis property test untuk JwtMemberStrategy (Property 5)
    - **Property 5: Member strategy menolak semua non-member/employee token**
    - **Validates: Requirements 3.4**
    - Gunakan `fc.string().filter(t => t !== 'member' && t !== 'employee')` untuk generate berbagai nilai `type`
    - Verifikasi `validate()` selalu throw `UnauthorizedException`

  - [x] 3.3 Buat `apps/api/src/modules/auth/guards/member-jwt.guard.ts`
    - `MemberJwtGuard extends AuthGuard('jwt-member')`
    - Export dari `apps/api/src/modules/auth/guards/index.ts`
    - _Requirements: 3.6, 3.7_

  - [x] 3.4 Update `apps/api/src/modules/auth/auth.module.ts`
    - Tambahkan `JwtMemberStrategy` ke providers
    - Ganti `defaultStrategy: 'jwt'` menjadi `defaultStrategy: 'jwt-member'`
    - _Requirements: 3.4, 3.6_

- [x] 4. Update semua admin controllers untuk pakai AdminJwtGuard
  - [x] 4.1 Update `apps/api/src/modules/companies/admin-dashboard.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` dengan `@UseGuards(AdminJwtGuard)`
    - Hapus method `ensureAdmin()` dan semua pemanggilan `this.ensureAdmin(req)`
    - Hapus semua filter `c.slug != 'super-admin'` dari query (tidak lagi relevan)
    - _Requirements: 4.1, 4.4, 8.1_

  - [x] 4.2 Update `apps/api/src/modules/companies/admin-companies.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` dengan `@UseGuards(AdminJwtGuard)`
    - Hapus method `ensureCompanyAdmin()` dan semua pemanggilan `this.ensureCompanyAdmin(req)`
    - _Requirements: 4.1, 4.4, 8.2_

  - [x] 4.3 Update `apps/api/src/modules/companies/admin-settings.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` dengan `@UseGuards(AdminJwtGuard)`
    - Hapus method `ensureAdmin()` dan semua pemanggilan `this.ensureAdmin(req)`
    - Update `GET /admin/settings` agar tidak lagi query `company.slug === 'super-admin'`; baca dari env config atau tabel settings terpisah
    - Update `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/:id`, `DELETE /admin/users/:id` agar query ke `admin_users` (inject `AdminUser` repository)
    - Pada `DELETE /admin/users/:id`: cek `req.user.id === id`, throw `BadRequestException('Cannot delete your own account')`
    - _Requirements: 4.1, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.1, 8.2_

  - [x] 4.4 Update `apps/api/src/modules/payment-gateway/payment-gateway-config.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` dengan `@UseGuards(AdminJwtGuard)`
    - Hapus method `ensureAdmin()` dan semua pemanggilan `this.ensureAdmin(req)`
    - _Requirements: 4.1, 4.4_

  - [x] 4.5 Update `apps/api/src/modules/payment-gateway/payment-gateway.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` pada endpoint `/admin/verify-payment` dan `/admin/pending-invoices` dengan `@UseGuards(AdminJwtGuard)`
    - Hapus pengecekan `req.user?.type !== 'company_admin'` dari kedua endpoint tersebut
    - _Requirements: 4.1, 4.4_

  - [x] 4.6 Update `apps/api/src/modules/email/email.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` dengan `@UseGuards(AdminJwtGuard)`
    - Hapus method `ensureAdmin()` dan semua pemanggilan `this.ensureAdmin(req)`
    - _Requirements: 4.1, 4.4_

  - [x] 4.7 Update `apps/api/src/modules/landing/landing.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` pada endpoint `/admin/*` dengan `@UseGuards(AdminJwtGuard)`
    - _Requirements: 4.1, 4.4_

  - [x] 4.8 Update `apps/api/src/modules/billing/billing.controller.ts`
    - Ganti guard pada endpoint `GET /billing/admin/invoices` dengan `@UseGuards(AdminJwtGuard)`
    - Hapus pengecekan `req.user?.type !== 'company_admin'`
    - _Requirements: 4.1, 4.4_

- [x] 5. Update semua member/auth controllers untuk pakai MemberJwtGuard
  - [x] 5.1 Update `apps/api/src/modules/auth/auth.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` pada `GET /auth/me` dengan `@UseGuards(MemberJwtGuard)`
    - _Requirements: 3.6, 4.2_

  - [x] 5.2 Update semua member controllers yang menggunakan `AuthGuard('jwt')`
    - File yang perlu diupdate: `users.controller.ts`, `stores.controller.ts`, `products.controller.ts`, `employees.controller.ts`, `transactions.controller.ts`, `customers.controller.ts`, `shifts.controller.ts`, `inventory.controller.ts`, `roles.controller.ts`, `taxes.controller.ts`, `discounts.controller.ts`, `payments.controller.ts`, `payment-methods.controller.ts`, `subscriptions.controller.ts`, `notifications.controller.ts`, `receipts.controller.ts`, `reports.controller.ts`, `suppliers.controller.ts`, `purchase-orders.controller.ts`, `fnb/*.controller.ts`, `laundry/*.controller.ts`, `audit.controller.ts`, `customers/customer-loyalty.controller.ts`
    - Ganti semua `AuthGuard('jwt')` dengan `MemberJwtGuard`
    - _Requirements: 3.6, 4.2_

  - [x] 5.3 Update `apps/api/src/modules/members/members.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` dengan `@UseGuards(MemberJwtGuard)`
    - _Requirements: 3.6, 4.2_

  - [x] 5.4 Update `apps/api/src/modules/subscriptions/subscription-plans.controller.ts`
    - Ganti semua `@UseGuards(AuthGuard('jwt'))` dengan `@UseGuards(MemberJwtGuard)` pada endpoint public/member
    - _Requirements: 3.6, 4.2_

  - [x] 5.5 Update `apps/api/src/modules/companies/companies.controller.ts`
    - Ganti `@UseGuards(AuthGuard('jwt'))` dengan `@UseGuards(MemberJwtGuard)`
    - _Requirements: 3.6, 4.2_

- [x] 6. Hapus semua referensi company_admin dan super-admin slug
  - [x] 6.1 Update `apps/api/src/modules/auth/auth.service.ts`
    - Hapus blok `isCompanyAdmin` dan semua logika `company.slug === 'super-admin'`
    - Method `login()`: hapus pengecekan `isCompanyAdmin`, semua user di `users` table adalah member
    - Method `generateTokens()`: selalu set `type: 'member'` (tidak ada lagi `company_admin`)
    - Method `getMe()`: hapus kondisi `type: 'company_admin'`, selalu return `type: 'member'`
    - Method `refreshToken()`: pastikan hanya query ke `users` table
    - _Requirements: 3.2, 4.4, 8.1, 8.4_

  - [x] 6.2 Update `apps/api/src/modules/auth/guards/permission.guard.ts`
    - Hapus blok `if (user.type === 'company_admin') { return true; }`
    - _Requirements: 4.4, 8.2_

  - [x] 6.3 Update `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
    - Hapus `'company_admin'` dari union type `JwtPayload.type`
    - Ubah type menjadi `'member' | 'employee' | 'user'`
    - _Requirements: 4.4_

  - [x] 6.4 Update `apps/api/src/modules/features/features.controller.ts`
    - Hapus semua pengecekan `req.user.type !== 'company_admin'`
    - Endpoint ini sekarang dilindungi `AdminJwtGuard` (pindahkan ke admin module) atau hapus jika tidak relevan
    - _Requirements: 4.4, 8.2_

  - [x] 6.5 Update `apps/api/src/modules/members/members.controller.ts`
    - Hapus semua pengecekan `req.user.type !== 'company_admin'`
    - _Requirements: 4.4, 8.2_

  - [x] 6.6 Update `apps/api/src/modules/subscriptions/subscription-plans.controller.ts`
    - Hapus method `ensureAdmin()` dan semua pemanggilan `this.ensureAdmin(req)`
    - Endpoint admin plans sekarang dilindungi `AdminJwtGuard`
    - _Requirements: 4.4, 8.2_

  - [x] 6.7 Update `apps/api/src/common/middleware/subscription-access.middleware.ts`
    - Hapus blok `if (userType === 'company_admin') { return next(); }`
    - Middleware ini tidak perlu dijalankan untuk route `/admin/*` (sudah diproteksi `AdminJwtGuard`)
    - _Requirements: 4.4, 8.1_

  - [x] 6.8 Update `apps/api/src/common/enums/index.ts`
    - Hapus `COMPANY_ADMIN = 'company_admin'` dari enum `UserType`
    - _Requirements: 4.4_

  - [ ]* 6.9 Tulis property test untuk cross-token rejection (Property 6 & 7)
    - **Property 6: Token admin ditolak di endpoint member**
    - **Property 7: Token member ditolak di endpoint admin**
    - **Validates: Requirements 3.7, 3.8**
    - Gunakan supertest: generate admin token → hit `GET /auth/me` → expect 403
    - Gunakan supertest: generate member token → hit `GET /admin/auth/me` → expect 403

- [x] 7. Checkpoint — Pastikan semua tests pass
  - Pastikan semua unit tests dan property tests pass, tanya user jika ada pertanyaan.

- [x] 8. Buat data migration script
  - [x] 8.1 Buat `apps/api/src/migrations/1711659980000-MigrateAdminUsersData.ts`
    - `up()`:
      1. Query semua `users` dengan `company_id` = id company ber-slug `'super-admin'`
      2. INSERT ke `admin_users` dengan mapping kolom yang sesuai (pertahankan `id`, `name`, `email`, `password_hash`, `is_active`, `last_login_at`, `created_at`, `updated_at`)
      3. Verifikasi count: jumlah record di `admin_users` harus sama dengan jumlah yang di-insert
      4. Jika count cocok: DELETE dari `users` WHERE `company_id` = super-admin company id
      5. Jika count tidak cocok: throw error (rollback otomatis karena dalam transaction)
      6. Script idempoten: gunakan `INSERT IGNORE` atau cek `ON DUPLICATE KEY UPDATE`
    - `down()`: tidak ada operasi (data tidak bisa di-rollback secara aman)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 9. Buat AdminSeeder baru
  - [x] 9.1 Buat `apps/api/src/common/seeders/admin-users.seeder.ts`
    - Inject hanya `Repository<AdminUser>` — tidak ada `Company` atau `User`
    - `onModuleInit()`: cek `adminUserRepo.count()`, jika > 0 skip
    - Jika kosong: buat satu record `AdminUser` dengan bcrypt hash cost 10
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 9.2 Tulis property test untuk AdminSeeder (Property 10)
    - **Property 10: Seeder idempoten**
    - **Validates: Requirements 7.4, 6.7**
    - Jalankan seeder 1–5 kali, verifikasi `adminUserRepo.count()` selalu sama dengan hasil eksekusi pertama

- [x] 10. Update frontend company-admin
  - [x] 10.1 Update `apps/company-admin/src/app/login/page.tsx`
    - Ganti `api.post('/auth/login', ...)` menjadi `api.post('/admin/auth/login', ...)`
    - _Requirements: 2.1_

  - [x] 10.2 Update `apps/company-admin/src/lib/api.ts`
    - Ganti endpoint refresh token dari `/auth/refresh` menjadi `/admin/auth/refresh`
    - _Requirements: 2.1_

- [x] 11. Update app.module.ts untuk register AdminAuthModule
  - [x] 11.1 Update `apps/api/src/app.module.ts`
    - Import dan tambahkan `AdminAuthModule` ke array `imports`
    - Tambahkan `AdminUser` ke array `entities` untuk TypeORM
    - Tambahkan `admin/auth/login` ke exclude list `TenantMiddleware`
    - Tambahkan `admin/auth/(.*)` ke exclude list `SubscriptionAccessMiddleware`
    - _Requirements: 2.1, 4.1_

  - [x] 11.2 Update `apps/api/src/modules/companies/companies.module.ts`
    - Import `AdminAuthModule` untuk mengakses `AdminJwtGuard` dan `AdminUser` repository
    - Tambahkan `AdminUser` ke `TypeOrmModule.forFeature`
    - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 12. Tulis property-based tests untuk semua correctness properties
  - [ ]* 12.1 Buat file test `apps/api/src/modules/admin-auth/admin-auth.properties.spec.ts`
    - Setup fast-check dengan minimum 100 iterasi per property
    - Implementasikan semua 10 property tests yang belum ditulis di task sebelumnya
    - **Property 3: Member JWT selalu mengandung type 'member'** — Validates: Requirements 3.2
    - Pastikan semua property tests dari task 2.2, 2.5, 2.6, 2.7, 2.8, 3.2, 6.9, 9.2 terintegrasi
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.8, 5.7, 2.6, 7.4_

- [x] 13. Final checkpoint — Pastikan semua tests pass
  - Pastikan semua unit tests, property tests, dan integration tests pass. Tanya user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Urutan implementasi harus diikuti karena ada dependency antar task (entity → module → guards → controllers → cleanup)
- Setiap task mereferensikan requirements spesifik untuk traceability
- Property tests menggunakan library **fast-check** dengan minimum 100 iterasi
- Setelah migrasi selesai, tabel `users` tidak boleh lagi memiliki record dengan `company_id` yang merujuk ke company ber-slug `super-admin`
