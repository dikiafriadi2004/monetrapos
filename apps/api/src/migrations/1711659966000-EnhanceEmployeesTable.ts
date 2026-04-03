import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class EnhanceEmployeesTable1711659966000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add user_id column (nullable, for linking to users table)
    await queryRunner.addColumn(
      'employees',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 2. Rename employee_code to employee_number
    await queryRunner.renameColumn('employees', 'employee_code', 'employee_number');

    // 3. Add salary column
    await queryRunner.addColumn(
      'employees',
      new TableColumn({
        name: 'salary',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
        isNullable: false,
      }),
    );

    // 4. Add foreign key for user_id
    await queryRunner.createForeignKey(
      'employees',
      new TableForeignKey({
        name: 'fk_employees_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // 5. Add index on user_id for faster lookups
    await queryRunner.createIndex(
      'employees',
      new TableIndex({
        name: 'idx_employees_user_id',
        columnNames: ['user_id'],
      }),
    );

    // 6. Add unique constraint on company_id + employee_number
    await queryRunner.createIndex(
      'employees',
      new TableIndex({
        name: 'idx_employees_company_employee_number',
        columnNames: ['company_id', 'employee_number'],
        isUnique: true,
      }),
    );

    // 7. Add index on company_id + store_id for faster filtering
    await queryRunner.createIndex(
      'employees',
      new TableIndex({
        name: 'idx_employees_company_store',
        columnNames: ['company_id', 'store_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('employees', 'idx_employees_company_store');
    await queryRunner.dropIndex('employees', 'idx_employees_company_employee_number');
    await queryRunner.dropIndex('employees', 'idx_employees_user_id');

    // Drop foreign key
    await queryRunner.dropForeignKey('employees', 'fk_employees_user_id');

    // Drop salary column
    await queryRunner.dropColumn('employees', 'salary');

    // Rename employee_number back to employee_code
    await queryRunner.renameColumn('employees', 'employee_number', 'employee_code');

    // Drop user_id column
    await queryRunner.dropColumn('employees', 'user_id');
  }
}
