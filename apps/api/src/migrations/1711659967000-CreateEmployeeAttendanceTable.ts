import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateEmployeeAttendanceTable1711659967000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create employee_attendance table
    await queryRunner.createTable(
      new Table({
        name: 'employee_attendance',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'employee_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'company_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'store_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'clock_in_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'clock_out_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'work_duration_minutes',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'break_duration_minutes',
            type: 'int',
            isNullable: true,
            default: 0,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key for employee_id
    await queryRunner.createForeignKey(
      'employee_attendance',
      new TableForeignKey({
        name: 'fk_employee_attendance_employee_id',
        columnNames: ['employee_id'],
        referencedTableName: 'employees',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign key for company_id
    await queryRunner.createForeignKey(
      'employee_attendance',
      new TableForeignKey({
        name: 'fk_employee_attendance_company_id',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign key for store_id
    await queryRunner.createForeignKey(
      'employee_attendance',
      new TableForeignKey({
        name: 'fk_employee_attendance_store_id',
        columnNames: ['store_id'],
        referencedTableName: 'stores',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create index on employee_id for faster lookups
    await queryRunner.createIndex(
      'employee_attendance',
      new TableIndex({
        name: 'idx_employee_attendance_employee_id',
        columnNames: ['employee_id'],
      }),
    );

    // Create index on clock_in_at for date-based queries
    await queryRunner.createIndex(
      'employee_attendance',
      new TableIndex({
        name: 'idx_employee_attendance_clock_in_date',
        columnNames: ['clock_in_at'],
      }),
    );

    // Create composite index on company_id and employee_id
    await queryRunner.createIndex(
      'employee_attendance',
      new TableIndex({
        name: 'idx_employee_attendance_company_employee',
        columnNames: ['company_id', 'employee_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('employee_attendance', 'idx_employee_attendance_company_employee');
    await queryRunner.dropIndex('employee_attendance', 'idx_employee_attendance_clock_in_date');
    await queryRunner.dropIndex('employee_attendance', 'idx_employee_attendance_employee_id');

    // Drop foreign keys
    await queryRunner.dropForeignKey('employee_attendance', 'fk_employee_attendance_store_id');
    await queryRunner.dropForeignKey('employee_attendance', 'fk_employee_attendance_company_id');
    await queryRunner.dropForeignKey('employee_attendance', 'fk_employee_attendance_employee_id');

    // Drop table
    await queryRunner.dropTable('employee_attendance');
  }
}
