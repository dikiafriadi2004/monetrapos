import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAdminUsersTable1711659979000 implements MigrationInterface {
  name = 'CreateAdminUsersTable1711659979000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'admin_users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: '(UUID())',
          },
          { name: 'name', type: 'varchar', length: '150', isNullable: false },
          { name: 'email', type: 'varchar', length: '100', isNullable: false, isUnique: true },
          { name: 'password_hash', type: 'varchar', length: '255', isNullable: false },
          {
            name: 'role',
            type: 'enum',
            enum: ['super_admin', 'admin'],
            default: "'admin'",
            isNullable: false,
          },
          { name: 'is_active', type: 'tinyint', width: 1, default: 1, isNullable: false },
          { name: 'last_login_at', type: 'timestamp', isNullable: true },
          { name: 'last_login_ip', type: 'varchar', length: '45', isNullable: true },
          { name: 'two_factor_enabled', type: 'tinyint', width: 1, default: 0, isNullable: false },
          { name: 'two_factor_secret', type: 'varchar', length: '255', isNullable: true },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'admin_users',
      new TableIndex({
        name: 'idx_admin_users_is_active',
        columnNames: ['is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin_users', true);
  }
}
