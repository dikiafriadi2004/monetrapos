import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateAdminUsersData1711659980000 implements MigrationInterface {
  name = 'MigrateAdminUsersData1711659980000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Find the super-admin company
    const superAdminCompanies = await queryRunner.query(
      `SELECT id FROM companies WHERE slug = 'super-admin' LIMIT 1`,
    );

    if (!superAdminCompanies || superAdminCompanies.length === 0) {
      console.log('No super-admin company found — skipping data migration');
      return;
    }

    const superAdminCompanyId = superAdminCompanies[0].id;

    // Find all users belonging to the super-admin company
    const adminUsers = await queryRunner.query(
      `SELECT id, name, email, password_hash, is_active, last_login_at, created_at, updated_at
       FROM users
       WHERE company_id = ?`,
      [superAdminCompanyId],
    );

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found in super-admin company — skipping data migration');
      return;
    }

    console.log(`Found ${adminUsers.length} admin user(s) to migrate`);

    // Insert into admin_users with ON DUPLICATE KEY UPDATE (idempotent)
    let insertedCount = 0;
    for (const user of adminUsers) {
      await queryRunner.query(
        `INSERT INTO admin_users (id, name, email, password_hash, role, is_active, last_login_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           password_hash = VALUES(password_hash),
           is_active = VALUES(is_active),
           last_login_at = VALUES(last_login_at),
           updated_at = VALUES(updated_at)`,
        [
          user.id,
          user.name,
          user.email,
          user.password_hash,
          user.is_active,
          user.last_login_at,
          user.created_at,
          user.updated_at,
        ],
      );
      insertedCount++;
    }

    // Verify count
    const countResult = await queryRunner.query(
      `SELECT COUNT(*) as count FROM admin_users WHERE id IN (${adminUsers.map(() => '?').join(',')})`,
      adminUsers.map((u: any) => u.id),
    );

    const migratedCount = parseInt(countResult[0].count, 10);

    if (migratedCount !== adminUsers.length) {
      throw new Error(
        `Migration count mismatch: expected ${adminUsers.length} but found ${migratedCount} in admin_users. Aborting deletion.`,
      );
    }

    // Delete from users table
    await queryRunner.query(
      `DELETE FROM users WHERE company_id = ?`,
      [superAdminCompanyId],
    );

    // Also delete the super-admin company itself
    await queryRunner.query(
      `DELETE FROM companies WHERE id = ?`,
      [superAdminCompanyId],
    );

    console.log(`Successfully migrated ${migratedCount} admin user(s) to admin_users table`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Data migration cannot be safely reversed
    // The original data has been deleted from users table
    console.log('MigrateAdminUsersData: down() is a no-op — data cannot be safely reversed');
  }
}
