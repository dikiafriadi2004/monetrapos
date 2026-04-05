# Requirements Document

## Introduction

Security fix untuk memisahkan tabel super admin platform dari tabel member/owner bisnis. Saat ini, super admin (company-admin portal) dan member/owner (member-admin portal) menggunakan tabel `users` yang sama di database MySQL, dibedakan hanya dengan kondisi `company.slug === 'super-admin'` yang rapuh. Pemisahan ini bertujuan menghilangkan risiko privilege escalation, data leakage lintas konteks, dan memperkuat boundary autentikasi antara dua domain yang berbeda secara fundamental.

Stack: NestJS + TypeORM + MySQL (backend), Next.js (dua frontend terpisah).

## Glossary

- **Admin_Auth_Service**: Service NestJS yang menangani autentikasi khusus untuk admin platform (`admin_users` table).
- **Member_Auth_Service**: Service NestJS yang menangani autentikasi khusus untuk member/owner bisnis (`users` table).
- **AdminUser**: Entitas yang merepresentasikan super admin platform, disimpan di tabel `admin_users`.
- **MemberUser**: Entitas yang merepresentasikan owner/member bisnis, disimpan di tabel `users`.
- **Admin_JWT_Strategy**: Passport strategy yang memvalidasi JWT dengan claim `type: 'admin'` dan hanya menerima token yang di-issue dari `admin_users`.
- **Member_JWT_Strategy**: Passport strategy yang memvalidasi JWT dengan claim `type: 'member'` dan hanya menerima token yang di-issue dari `users`.
- **Admin_Guard**: NestJS guard yang memproteksi endpoint admin platform, hanya mengizinkan token dengan `type: 'admin'`.
- **Member_Guard**: NestJS guard yang memproteksi endpoint member portal, hanya mengizinkan token dengan `type: 'member'` atau `type: 'employee'`.
- **Migration**: TypeORM migration script untuk perubahan skema database.
- **Data_Migration_Script**: Script satu kali untuk memindahkan data admin dari `users` ke `admin_users`.
- **Seeder**: Script untuk mengisi data awal `admin_users` setelah migrasi.

---

## Requirements

### Requirement 1: Tabel Terpisah untuk Admin Platform

**User Story:** Sebagai security engineer, saya ingin super admin platform disimpan di tabel terpisah `admin_users`, sehingga tidak ada kemungkinan query atau join yang tidak disengaja antara data admin dan data member bisnis.

#### Acceptance Criteria

1. THE System SHALL menyediakan tabel `admin_users` di database dengan kolom: `id`, `name`, `email`, `password_hash`, `role`, `is_active`, `last_login_at`, `last_login_ip`, `two_factor_enabled`, `two_factor_secret`, `created_at`, `updated_at`, `deleted_at`.
2. THE System SHALL menyediakan entitas TypeORM `AdminUser` yang di-map ke tabel `admin_users` dan tidak memiliki relasi ke tabel `users` maupun tabel `companies`.
3. THE System SHALL memastikan kolom `email` pada tabel `admin_users` memiliki constraint `UNIQUE`.
4. WHEN tabel `admin_users` dibuat, THE System SHALL membuat index pada kolom `email` dan `is_active` untuk performa query.
5. THE System SHALL memastikan tabel `users` tidak lagi menyimpan entri dengan `company_id` yang merujuk ke company ber-slug `super-admin` setelah migrasi selesai.

---

### Requirement 2: Endpoint Autentikasi Terpisah untuk Admin Platform

**User Story:** Sebagai super admin, saya ingin login melalui endpoint khusus `/admin/auth/login` yang hanya memeriksa tabel `admin_users`, sehingga credential admin tidak pernah divalidasi terhadap tabel member.

#### Acceptance Criteria

1. THE Admin_Auth_Service SHALL menyediakan endpoint `POST /admin/auth/login` yang hanya melakukan lookup ke tabel `admin_users`.
2. WHEN request login diterima di `POST /admin/auth/login`, THE Admin_Auth_Service SHALL memvalidasi password menggunakan bcrypt terhadap kolom `password_hash` di tabel `admin_users`.
3. IF email tidak ditemukan di tabel `admin_users`, THEN THE Admin_Auth_Service SHALL mengembalikan HTTP 401 dengan pesan `Invalid credentials` tanpa mengindikasikan apakah email terdaftar atau tidak.
4. IF akun `AdminUser` memiliki `is_active = false`, THEN THE Admin_Auth_Service SHALL mengembalikan HTTP 401 dengan pesan `Account is deactivated`.
5. THE Member_Auth_Service SHALL memastikan endpoint `POST /auth/login` hanya melakukan lookup ke tabel `users` dan tidak pernah memeriksa tabel `admin_users`.
6. WHEN login admin berhasil, THE Admin_Auth_Service SHALL memperbarui kolom `last_login_at` dan `last_login_ip` pada record `AdminUser` yang bersangkutan.

---

### Requirement 3: JWT dengan Claim Terpisah dan Tidak Dapat Di-cross

**User Story:** Sebagai security engineer, saya ingin JWT admin dan JWT member menggunakan claim `type` yang berbeda dan divalidasi oleh strategy yang berbeda, sehingga token admin tidak dapat digunakan untuk mengakses endpoint member dan sebaliknya.

#### Acceptance Criteria

1. WHEN Admin_Auth_Service menerbitkan JWT, THE Admin_Auth_Service SHALL menyertakan claim `type: 'admin'` dan `sub` yang merujuk ke `id` dari tabel `admin_users`.
2. WHEN Member_Auth_Service menerbitkan JWT, THE Member_Auth_Service SHALL menyertakan claim `type: 'member'` dan `sub` yang merujuk ke `id` dari tabel `users`.
3. THE Admin_JWT_Strategy SHALL menolak token dengan `type` selain `'admin'` dengan melempar `UnauthorizedException`.
4. THE Member_JWT_Strategy SHALL menolak token dengan `type` selain `'member'` dan `'employee'` dengan melempar `UnauthorizedException`.
5. THE Admin_Guard SHALL hanya mengizinkan request yang telah divalidasi oleh `Admin_JWT_Strategy`.
6. THE Member_Guard SHALL hanya mengizinkan request yang telah divalidasi oleh `Member_JWT_Strategy`.
7. IF token JWT admin digunakan pada endpoint yang diproteksi `Member_Guard`, THEN THE Member_Guard SHALL mengembalikan HTTP 403 Forbidden.
8. IF token JWT member digunakan pada endpoint yang diproteksi `Admin_Guard`, THEN THE Admin_Guard SHALL mengembalikan HTTP 403 Forbidden.

---

### Requirement 4: Pemisahan Endpoint Admin Platform dari Endpoint Member

**User Story:** Sebagai security engineer, saya ingin semua endpoint admin platform (`/admin/*`) diproteksi secara eksklusif oleh `Admin_Guard`, sehingga tidak ada endpoint admin yang dapat diakses dengan token member.

#### Acceptance Criteria

1. THE System SHALL memastikan semua controller dengan prefix `/admin` menggunakan `Admin_Guard` sebagai guard autentikasi.
2. THE System SHALL memastikan semua controller yang diakses member portal tidak menggunakan `Admin_Guard`.
3. WHEN `Admin_Guard` memvalidasi request, THE Admin_Guard SHALL memeriksa bahwa `type === 'admin'` pada JWT payload sebelum mengizinkan akses.
4. THE System SHALL menghapus semua pengecekan `user.type === 'company_admin'` dan `company.slug === 'super-admin'` dari codebase setelah migrasi selesai.
5. IF request ke endpoint `/admin/*` tidak menyertakan header `Authorization`, THEN THE Admin_Guard SHALL mengembalikan HTTP 401 Unauthorized.

---

### Requirement 5: Manajemen AdminUser oleh Admin Platform

**User Story:** Sebagai super admin, saya ingin dapat membuat, memperbarui, menonaktifkan, dan menghapus akun admin lain melalui endpoint manajemen, sehingga pengelolaan akun admin tidak bergantung pada tabel `users`.

#### Acceptance Criteria

1. THE Admin_Auth_Service SHALL menyediakan endpoint `GET /admin/settings/users` yang mengembalikan daftar semua `AdminUser` dari tabel `admin_users`.
2. THE Admin_Auth_Service SHALL menyediakan endpoint `POST /admin/settings/users` untuk membuat `AdminUser` baru di tabel `admin_users`.
3. WHEN membuat `AdminUser` baru, THE Admin_Auth_Service SHALL memvalidasi bahwa `email` belum terdaftar di tabel `admin_users`.
4. THE Admin_Auth_Service SHALL menyediakan endpoint `PATCH /admin/settings/users/:id` untuk memperbarui data `AdminUser` di tabel `admin_users`.
5. THE Admin_Auth_Service SHALL menyediakan endpoint `DELETE /admin/settings/users/:id` untuk menghapus `AdminUser` dari tabel `admin_users`.
6. IF admin mencoba menghapus akun dirinya sendiri, THEN THE Admin_Auth_Service SHALL mengembalikan HTTP 400 dengan pesan `Cannot delete your own account`.
7. WHEN password `AdminUser` diperbarui, THE Admin_Auth_Service SHALL melakukan hashing menggunakan bcrypt dengan cost factor minimal 10 sebelum menyimpan ke database.

---

### Requirement 6: Migrasi Data yang Aman

**User Story:** Sebagai database administrator, saya ingin proses migrasi data admin dari tabel `users` ke tabel `admin_users` dilakukan secara aman dan dapat di-rollback, sehingga tidak ada data yang hilang selama transisi.

#### Acceptance Criteria

1. THE Migration SHALL membuat tabel `admin_users` sebelum memindahkan data apapun.
2. THE Data_Migration_Script SHALL menyalin semua record dari tabel `users` yang memiliki `company_id` sama dengan company ber-slug `super-admin` ke tabel `admin_users`.
3. WHEN menyalin data, THE Data_Migration_Script SHALL mempertahankan nilai `id`, `name`, `email`, `password_hash`, `is_active`, `last_login_at`, `created_at`, dan `updated_at` dari record asli.
4. THE Data_Migration_Script SHALL memverifikasi jumlah record yang berhasil disalin sebelum menghapus data dari tabel `users`.
5. IF jumlah record di `admin_users` setelah insert tidak sama dengan jumlah record yang akan dihapus dari `users`, THEN THE Data_Migration_Script SHALL membatalkan operasi dan mengembalikan error tanpa menghapus data dari `users`.
6. THE Migration SHALL menyediakan fungsi `down()` yang dapat mengembalikan skema ke kondisi sebelum migrasi (rollback).
7. THE Data_Migration_Script SHALL dapat dijalankan secara idempoten: jika dijalankan dua kali, THE Data_Migration_Script SHALL tidak menduplikasi data atau menghasilkan error.

---

### Requirement 7: Seeder untuk Admin Awal Pasca-Migrasi

**User Story:** Sebagai developer, saya ingin seeder yang membuat akun admin awal langsung di tabel `admin_users`, sehingga sistem dapat diinisialisasi tanpa bergantung pada tabel `users` atau company `super-admin`.

#### Acceptance Criteria

1. THE Seeder SHALL membuat minimal satu record `AdminUser` di tabel `admin_users` jika tabel tersebut kosong.
2. THE Seeder SHALL tidak membuat atau memodifikasi record apapun di tabel `users` atau tabel `companies`.
3. WHEN Seeder dijalankan, THE Seeder SHALL melakukan hashing password menggunakan bcrypt dengan cost factor minimal 10.
4. IF tabel `admin_users` sudah memiliki minimal satu record, THEN THE Seeder SHALL melewati proses seeding tanpa error.

---

### Requirement 8: Penghapusan Dependensi `super-admin` Slug

**User Story:** Sebagai security engineer, saya ingin menghapus semua logika yang bergantung pada `company.slug === 'super-admin'` dari codebase, sehingga tidak ada lagi celah privilege escalation melalui manipulasi slug company.

#### Acceptance Criteria

1. THE System SHALL menghapus semua kondisi pengecekan `company.slug === 'super-admin'` dari `auth.service.ts`, `permission.guard.ts`, dan semua file lain yang mengandung kondisi tersebut.
2. THE System SHALL menghapus semua kondisi pengecekan `user.type === 'company_admin'` dari `permission.guard.ts` dan menggantinya dengan pengecekan `Admin_Guard` pada level routing.
3. WHEN `getMe()` dipanggil oleh admin, THE Admin_Auth_Service SHALL mengembalikan data dari tabel `admin_users` tanpa menyertakan field `company` atau `companyId`.
4. THE System SHALL memastikan tidak ada query yang melakukan join antara tabel `admin_users` dan tabel `users` dalam konteks autentikasi atau otorisasi.
