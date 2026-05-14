import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRoleToEmployees1711659982000 implements MigrationInterface {
  name = 'AddRoleToEmployees1711659982000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRole = await queryRunner.hasColumn('employees', 'role');
    if (!hasRole) {
      await queryRunner.addColumn(
        'employees',
        new TableColumn({
          name: 'role',
          type: 'varchar',
          length: '50',
          isNullable: true,
          default: "'cashier'",
        }),
      );

      // Sync role dari user account yang sudah ada
      await queryRunner.query(`
        UPDATE employees e
        INNER JOIN users u ON e.user_id = u.id
        SET e.role = u.role
        WHERE e.user_id IS NOT NULL AND e.role IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('employees', 'role');
  }
}
