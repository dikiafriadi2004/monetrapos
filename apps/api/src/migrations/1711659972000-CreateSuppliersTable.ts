import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSuppliersTable1711659972000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'suppliers',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'company_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'supplier_code',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'contact_person',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'province',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'postal_code',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'tax_id',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'bank_name',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'bank_account_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'bank_account_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'payment_terms_days',
            type: 'int',
            default: 30,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    // Create index on company_id
    await queryRunner.createIndex(
      'suppliers',
      new TableIndex({
        name: 'IDX_SUPPLIERS_COMPANY_ID',
        columnNames: ['company_id'],
      }),
    );

    // Create index on supplier_code
    await queryRunner.createIndex(
      'suppliers',
      new TableIndex({
        name: 'IDX_SUPPLIERS_CODE',
        columnNames: ['supplier_code'],
        isUnique: true,
      }),
    );

    // Create foreign key to companies table
    await queryRunner.createForeignKey(
      'suppliers',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'companies',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('suppliers');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('company_id') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('suppliers', foreignKey);
      }
    }

    await queryRunner.dropIndex('suppliers', 'IDX_SUPPLIERS_CODE');
    await queryRunner.dropIndex('suppliers', 'IDX_SUPPLIERS_COMPANY_ID');
    await queryRunner.dropTable('suppliers');
  }
}
