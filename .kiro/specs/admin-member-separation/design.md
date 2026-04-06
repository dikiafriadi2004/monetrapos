# Design Document: Admin-Member Separation

## Overview

Fitur ini memisahkan tabel dan autentikasi super admin platform dari tabel member/owner bisnis. Saat ini keduanya berbagi tabel `users` dan dibedakan hanya dengan `company.slug === 'super-admin'` — sebuah mekanisme yang rapuh dan berisiko privilege escalation.

Solusinya adalah:
1. Membuat tabel `admin_users` terpisah dengan entitas TypeORM sendiri
2. Membuat `AdminAuthModule` dengan JWT strategy, guard, dan controller tersendiri
3. Memigrasikan data admin dari `users` ke `admin_users`
4. Menghapus semua referensi `company.slug === 'super-admin'` dan `user.type === 'company_admin'`
5. Memperbarui frontend company-admin untuk hit endpoint `/admin/auth/login`

Setelah migrasi, dua domain autentikasi benar-benar terisolasi: token admin tidak bisa dipakai di endpoint member, dan sebaliknya.

---

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        CA[company-admin<br/>localStorage: company_token]
        MA[member-admin<br/>localStorage: access_token]
    end

    subgraph "API Gateway"
        AAL[POST /admin/auth/login]
        AAM[GET /admin/auth/me]
        AE[/admin/* endpoints]
        ME[/auth/* endpoints<br/>/stores, /products, etc.]
    end

    subgraph "Auth Layer"
        AG[AdminJwtGuard<br/>jwt-admin strategy]
        MG[MemberJwtGuard<br/>jwt-member strategy]
    end

    subgraph "Services"
        AAS[AdminAuthService]
        AS[AuthService]
    end

    subgraph "Database"
        AU[(admin_users)]
        U[(users)]
    end

    CA -->|Bearer company_token| AAL
    CA -->|Bearer company_token| AE
    MA -->|Bearer access_token| ME

    AAL --> AAS
    AAM --> AG --> AAS
    AE --> AG

    ME --> MG

    AAS --> AU
    AS --> U

    AG -->|validates type=admin| AU
    MG -->|validates type=member/employee| U
```

### Prinsip Isolasi

- `AdminJwtGuard` hanya menerima token dengan `type: 'admin'` — divalidasi oleh `JwtAdminStrategy`
- `MemberJwtGuard` hanya menerima token dengan `type: 'member'` atau `type: 'employee'` — divalidasi oleh `JwtMemberStrategy`
- `AdminAuthService` hanya query ke `admin_users`, tidak pernah ke `users`
- `AuthService` (existing) hanya query ke `users`, tidak pernah ke `admin_users`
- Tidak ada join atau relasi antar kedua tabel dalam konteks autentikasi

---

## Components and Interfaces

### 1. AdminUser Entity

File: `apps/api/src/modules/admin-auth/admin-user.entity.ts`

```typescript
@Entity('admin_users')
export class AdminUser extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @Column({ length: 45, nullable: true, name: 'last_login_ip' })
  lastLoginIp: string;

  @Column({ default: false, name: 'two_factor_enabled' })
  twoFactorEnabled: boolean;

  @Column({ length: 255, nullable: true, name: 'two_factor_secret' })
  twoFactorSecret: string;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}
```

Tidak ada `@ManyToOne` ke `Company` atau `User`. Entitas ini sepenuhnya independen.

### 2. JwtAdminStrategy

File: `apps/api/src/modules/admin-auth/strategies/jwt-admin.strategy.ts`

```typescript
@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type');
    }
    return { id: payload.sub, email: payload.email, type: 'admin', role: payload.role };
  }
}
```

### 3. JwtMemberStrategy (Refactor dari JwtStrategy)

File: `apps/api/src/modules/auth/strategies/jwt-member.strategy.ts`

Strategy baru dengan nama `'jwt-member'` menggantikan `'jwt'`. Menolak token dengan `type === 'admin'`.

```typescript
@Injectable()
export class JwtMemberStrategy extends PassportStrategy(Strategy, 'jwt-member') {
  async validate(payload: JwtPayload) {
    if (payload.type !== 'member' && payload.type !== 'employee') {
      throw new UnauthorizedException('Invalid token type');
    }
    return { id: payload.sub, email: payload.email, type: payload.type, ... };
  }
}
```

### 4. Guards

**AdminJwtGuard** — `apps/api/src/modules/admin-auth/guards/admin-jwt.guard.ts`
```typescript
@Injectable()
export class AdminJwtGuard extends AuthGuard('jwt-admin') {}
```

**MemberJwtGuard** — `apps/api/src/modules/auth/guards/member-jwt.guard.ts`
```typescript
@Injectable()
export class MemberJwtGuard extends AuthGuard('jwt-member') {}
```

Guard lama `AuthGuard('jwt')` di semua admin controllers diganti dengan `AdminJwtGuard`. Guard di member controllers diganti dengan `MemberJwtGuard`.

### 5. AdminAuthModule

File: `apps/api/src/modules/admin-auth/admin-auth.module.ts`

Module baru yang sepenuhnya terpisah dari `AuthModule`:

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    PassportModule,
    JwtModule.registerAsync({ ... }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, JwtAdminStrategy],
  exports: [AdminAuthService, JwtModule],
})
export class AdminAuthModule {}
```

### 6. AdminAuthController

File: `apps/api/src/modules/admin-auth/admin-auth.controller.ts`

| Method | Path | Guard | Deskripsi |
|--------|------|-------|-----------|
| POST | `/admin/auth/login` | — (public) | Login admin, lookup ke `admin_users` |
| GET | `/admin/auth/me` | AdminJwtGuard | Get current admin profile |

### 7. AdminAuthService

File: `apps/api/src/modules/admin-auth/admin-auth.service.ts`

Method utama:
- `login(dto: LoginDto)` — lookup ke `admin_users`, bcrypt compare, issue JWT dengan `type: 'admin'`
- `getMe(adminId: string)` — return data dari `admin_users` tanpa field company/companyId
- `generateToken(admin: AdminUser)` — sign JWT dengan payload `{ sub, email, type: 'admin', role }`

### 8. Perubahan pada AdminSettingsController

`AdminSettingsController` saat ini mengelola admin users via `users` table. Setelah migrasi:
- Endpoint `GET /admin/users` → query ke `admin_users`
- Endpoint `POST /admin/users` → insert ke `admin_users`
- Endpoint `PATCH /admin/users/:id` → update `admin_users`
- Endpoint `DELETE /admin/users/:id` → delete dari `admin_users`
- Endpoint `GET /admin/settings` → tidak lagi query `company.slug === 'super-admin'`; settings disimpan di tabel terpisah atau env config

### 9. Perubahan pada PermissionGuard

Hapus blok:
```typescript
// HAPUS INI:
if (user.type === 'company_admin') {
  return true;
}
```

Admin platform tidak lagi melewati `PermissionGuard` karena semua endpoint `/admin/*` diproteksi `AdminJwtGuard` yang sudah memvalidasi identity.

---

## Data Models

### Tabel `admin_users`

```sql
CREATE TABLE admin_users (
  id           VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  email        VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at DATETIME    NULL,
  last_login_ip VARCHAR(45) NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_secret  VARCHAR(255) NULL,
  created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deleted_at   DATETIME(6)  NULL,
  UNIQUE KEY uq_admin_users_email (email),
  KEY idx_admin_users_is_active (is_active)
);
```

### JWT Payload Comparison

| Field | Admin Token | Member Token | Employee Token |
|-------|-------------|--------------|----------------|
| `sub` | `admin_users.id` | `users.id` | `employees.id` |
| `type` | `'admin'` | `'member'` | `'employee'` |
| `companyId` | — (tidak ada) | `users.company_id` | `employees.company_id` |
| `role` | `AdminRole` | `UserRole` | — |
| `permissions` | — | `string[]` | `string[]` |

### Migration Plan

**TypeORM Migration** (`CreateAdminUsersTable`):
- `up()`: CREATE TABLE `admin_users` dengan semua kolom dan constraints
- `down()`: DROP TABLE `admin_users`

**Data Migration Script** (`MigrateAdminUsersData`):
1. Query semua `users` dengan `company_id` = id company ber-slug `'super-admin'`
2. INSERT ke `admin_users` dengan mapping kolom yang sesuai
3. Verifikasi count: `SELECT COUNT(*) FROM admin_users` harus sama dengan jumlah yang di-insert
4. Jika count cocok: DELETE dari `users` WHERE `company_id` = super-admin company id
5. Jika count tidak cocok: ROLLBACK, throw error
6. Script idempoten: cek `ON DUPLICATE KEY UPDATE` atau skip jika email sudah ada

**New AdminSeeder** (`AdminSeeder` baru):
- Hanya insert ke `admin_users`
- Tidak menyentuh `users` atau `companies`
- Skip jika `admin_users` sudah ada minimal 1 record

### Frontend Changes

**company-admin** (`apps/company-admin/src/app/login/page.tsx`):
```typescript
// SEBELUM:
const res = await api.post('/auth/login', { email, password });

// SESUDAH:
const res = await api.post('/admin/auth/login', { email, password });
```

**company-admin** (`apps/company-admin/src/lib/api.ts`) — refresh token endpoint:
```typescript
// SEBELUM:
await axios.post(`${API_URL}/auth/refresh`, { refreshToken: currentToken });

// SESUDAH:
await axios.post(`${API_URL}/admin/auth/refresh`, { refreshToken: currentToken });
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Admin login hanya query admin_users

*For any* login credentials yang dikirim ke `POST /admin/auth/login`, `AdminAuthService` SHALL hanya melakukan database lookup ke tabel `admin_users` dan tidak pernah ke tabel `users`.

**Validates: Requirements 2.1, 2.5**

### Property 2: Admin JWT selalu mengandung type 'admin'

*For any* `AdminUser` yang berhasil login, JWT yang dihasilkan SHALL selalu mengandung claim `type: 'admin'` dan `sub` yang merujuk ke `admin_users.id`.

**Validates: Requirements 3.1**

### Property 3: Member JWT selalu mengandung type 'member'

*For any* `User` (member/owner) yang berhasil login, JWT yang dihasilkan SHALL selalu mengandung claim `type: 'member'` dan `sub` yang merujuk ke `users.id`.

**Validates: Requirements 3.2**

### Property 4: Admin strategy menolak semua non-admin token

*For any* JWT payload di mana `type !== 'admin'`, `JwtAdminStrategy.validate()` SHALL melempar `UnauthorizedException`.

**Validates: Requirements 3.3**

### Property 5: Member strategy menolak semua non-member/employee token

*For any* JWT payload di mana `type` bukan `'member'` maupun `'employee'`, `JwtMemberStrategy.validate()` SHALL melempar `UnauthorizedException`.

**Validates: Requirements 3.4**

### Property 6: Token admin ditolak di endpoint member

*For any* token JWT yang valid dengan `type: 'admin'`, menggunakannya pada endpoint yang diproteksi `MemberJwtGuard` SHALL menghasilkan HTTP 403 Forbidden.

**Validates: Requirements 3.7**

### Property 7: Token member ditolak di endpoint admin

*For any* token JWT yang valid dengan `type: 'member'` atau `type: 'employee'`, menggunakannya pada endpoint yang diproteksi `AdminJwtGuard` SHALL menghasilkan HTTP 403 Forbidden.

**Validates: Requirements 3.8**

### Property 8: Password admin selalu di-hash dengan bcrypt cost >= 10

*For any* password string yang disimpan atau diperbarui untuk `AdminUser`, nilai yang tersimpan di kolom `password_hash` SHALL merupakan bcrypt hash yang valid dengan cost factor minimal 10.

**Validates: Requirements 5.7**

### Property 9: Successful admin login selalu memperbarui last_login_at

*For any* `AdminUser` yang berhasil login, nilai `last_login_at` di tabel `admin_users` SHALL diperbarui ke timestamp saat login terjadi.

**Validates: Requirements 2.6**

### Property 10: Seeder idempoten

*For any* jumlah eksekusi seeder (1 kali atau lebih), jumlah record di tabel `admin_users` SHALL sama dengan hasil eksekusi pertama — tidak ada duplikasi data.

**Validates: Requirements 7.4, 6.7**

---

## Error Handling

| Skenario | HTTP Status | Pesan |
|----------|-------------|-------|
| Email tidak ditemukan di `admin_users` | 401 | `Invalid credentials` |
| Password salah | 401 | `Invalid credentials` |
| Akun `is_active = false` | 401 | `Account is deactivated` |
| Token admin dipakai di endpoint member | 403 | `Forbidden` |
| Token member dipakai di endpoint admin | 403 | `Forbidden` |
| Tidak ada Authorization header | 401 | `Unauthorized` |
| Admin mencoba hapus akun sendiri | 400 | `Cannot delete your own account` |
| Email sudah terdaftar di `admin_users` | 409 | `Email already exists` |
| Data migration count mismatch | 500 | Error + rollback, tidak ada data yang dihapus |

**Prinsip keamanan**: Endpoint login tidak pernah mengindikasikan apakah email terdaftar atau tidak — selalu kembalikan `Invalid credentials` untuk kasus email tidak ditemukan maupun password salah.

---

## Testing Strategy

### Unit Tests (Example-based)

- `AdminAuthService.login()` dengan email tidak ditemukan → 401
- `AdminAuthService.login()` dengan akun non-aktif → 401
- `AdminAuthService.login()` berhasil → token dengan `type: 'admin'`
- `AdminAuthService.getMe()` → tidak ada field `company` atau `companyId`
- `AdminSettingsController` CRUD admin users → operasi ke `admin_users`
- Admin mencoba hapus akun sendiri → 400
- Request ke `/admin/*` tanpa Authorization header → 401

### Property-Based Tests

Menggunakan library **fast-check** (TypeScript/Jest compatible).

Setiap property test dikonfigurasi minimum **100 iterasi**.

**Property 1** — `Feature: admin-member-separation, Property 1: Admin login hanya query admin_users`
```typescript
fc.assert(fc.asyncProperty(
  fc.record({ email: fc.emailAddress(), password: fc.string() }),
  async (credentials) => {
    // Mock adminUserRepo.findOne, verify userRepo.findOne never called
  }
), { numRuns: 100 });
```

**Property 2 & 3** — JWT claim type
```typescript
fc.assert(fc.asyncProperty(
  arbitraryAdminUser(),
  async (adminUser) => {
    const token = await adminAuthService.generateToken(adminUser);
    const payload = jwtService.decode(token);
    expect(payload.type).toBe('admin');
    expect(payload.sub).toBe(adminUser.id);
  }
), { numRuns: 100 });
```

**Property 4 & 5** — Strategy rejection
```typescript
fc.assert(fc.asyncProperty(
  fc.record({
    sub: fc.uuid(),
    type: fc.string().filter(t => t !== 'admin'),
  }),
  async (payload) => {
    await expect(jwtAdminStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  }
), { numRuns: 100 });
```

**Property 6 & 7** — Cross-token rejection (integration test dengan supertest)
```typescript
fc.assert(fc.asyncProperty(
  arbitraryAdminToken(),
  async (adminToken) => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  }
), { numRuns: 100 });
```

**Property 8** — bcrypt cost factor
```typescript
fc.assert(fc.asyncProperty(
  fc.string({ minLength: 6 }),
  async (password) => {
    const hash = await adminAuthService.hashPassword(password);
    const rounds = bcrypt.getRounds(hash);
    expect(rounds).toBeGreaterThanOrEqual(10);
  }
), { numRuns: 100 });
```

**Property 9** — last_login_at update
```typescript
fc.assert(fc.asyncProperty(
  arbitraryAdminUser(),
  async (adminUser) => {
    const before = new Date();
    await adminAuthService.login({ email: adminUser.email, password: 'valid' });
    const updated = await adminUserRepo.findOne({ where: { id: adminUser.id } });
    expect(updated.lastLoginAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  }
), { numRuns: 100 });
```

**Property 10** — Seeder idempoten
```typescript
fc.assert(fc.asyncProperty(
  fc.integer({ min: 1, max: 5 }),
  async (runs) => {
    for (let i = 0; i < runs; i++) await adminSeeder.seed();
    const count = await adminUserRepo.count();
    expect(count).toBe(1); // selalu 1, tidak bertambah
  }
), { numRuns: 50 });
```

### Integration Tests

- Migration `up()` membuat tabel `admin_users` dengan schema yang benar
- Migration `down()` menghapus tabel `admin_users`
- Data migration script memindahkan data dari `users` ke `admin_users` dengan benar
- Data migration script idempoten (dijalankan dua kali tidak duplikasi)
- End-to-end: login via `/admin/auth/login` → akses `/admin/dashboard/stats` berhasil
- End-to-end: login via `/auth/login` → akses `/admin/dashboard/stats` gagal dengan 403
