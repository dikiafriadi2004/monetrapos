import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class EnhanceCustomersAndLoyaltyPoints1711659965000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create loyalty_point_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'loyalty_point_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'customer_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'company_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['earn', 'redeem', 'adjustment', 'expire'],
            isNullable: false,
          },
          {
            name: 'points',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'balance_after',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'reference_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'reference_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'performed_by',
            type: 'uuid',
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
        foreignKeys: [
          {
            columnNames: ['customer_id'],
            referencedTableName: 'customers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['company_id'],
            referencedTableName: 'companies',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['performed_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          {
            name: 'idx_loyalty_point_transactions_customer_id',
            columnNames: ['customer_id'],
          },
          {
            name: 'idx_loyalty_point_transactions_company_id',
            columnNames: ['company_id'],
          },
          {
            name: 'idx_loyalty_point_transactions_created_at',
            columnNames: ['created_at'],
          },
        ],
      }),
      true,
    );

    // Add new columns to customers table
    await queryRunner.addColumn(
      'customers',
      new TableColumn({
        name: 'loyalty_tier',
        type: 'enum',
        enum: ['regular', 'silver', 'gold', 'platinum'],
        default: "'regular'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'customers',
      new TableColumn({
        name: 'date_of_birth',
        type: 'date',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'customers',
      new TableColumn({
        name: 'gender',
        type: 'enum',
        enum: ['male', 'female', 'other'],
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'customers',
      new TableColumn({
        name: 'notes',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from customers table
    await queryRunner.dropColumn('customers', 'notes');
    await queryRunner.dropColumn('customers', 'gender');
    await queryRunner.dropColumn('customers', 'date_of_birth');
    await queryRunner.dropColumn('customers', 'loyalty_tier');

    // Drop loyalty_point_transactions table
    await queryRunner.dropTable('loyalty_point_transactions', true);
  }
}
