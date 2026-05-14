import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class EnhanceEmployeesTable1711659966000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('employees');

    // 1. Add user_id column (nullable, for linking to users table)
    if (!table?.columns.find((c) => c.name === 'user_id')) {
      await queryRunner.addColumn('employees', new TableColumn({ name: 'user_id', type: 'varchar', length: '36', isNullable: true }));
      await queryRunner.createForeignKey('employees', new TableForeignKey({ name: 'fk_employees_user_id', columnNames: ['user_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'SET NULL', onUpdate: 'CASCADE' }));
      await queryRunner.createIndex('employees', new TableIndex({ name: 'idx_employees_user_id', columnNames: ['user_id'] }));
    }

    // 2. Rename employee_code to employee_number if old column exists
    const hasEmployeeCode = await queryRunner.hasColumn('employees', 'employee_code');
    const hasEmployeeNumber = await queryRunner.hasColumn('employees', 'employee_number');
    if (hasEmployeeCode && !hasEmployeeNumber) {
      await queryRunner.renameColumn('employees', 'employee_code', 'employee_number');
    }

    // 3. Add salary column
    if (!table?.columns.find((c) => c.name === 'salary')) {
      await queryRunner.addColumn('employees', new TableColumn({ name: 'salary', type: 'decimal', precision: 15, scale: 2, default: 0, isNullable: false }));
    }

    // 4. Add indexes only if they don't exist
    const existingIndexes = (await queryRunner.getTable('employees'))?.indices.map((i) => i.name) ?? [];
    if (!existingIndexes.includes('idx_employees_company_employee_number')) {
      await queryRunner.createIndex('employees', new TableIndex({ name: 'idx_employees_company_employee_number', columnNames: ['company_id', 'employee_number'], isUnique: true }));
    }
    if (!existingIndexes.includes('idx_employees_company_store')) {
      await queryRunner.createIndex('employees', new TableIndex({ name: 'idx_employees_company_store', columnNames: ['company_id', 'store_id'] }));
    }
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
