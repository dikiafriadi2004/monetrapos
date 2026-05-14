import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePaymentMethodsTable1711659969000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('payment_methods');
    await queryRunner.createTable(
      new Table({
        name: 'payment_methods',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'code', type: 'varchar', length: '50', isNullable: false },
          { name: 'type', type: 'enum', enum: ['cash', 'card', 'ewallet', 'bank_transfer', 'qris', 'other'], default: "'cash'", isNullable: false },
          { name: 'icon_url', type: 'varchar', length: '255', isNullable: true },
          { name: 'color', type: 'varchar', length: '20', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'requires_reference', type: 'boolean', default: false },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'account_code', type: 'varchar', length: '50', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    if (!tableExists) {
      await queryRunner.createIndex('payment_methods', new TableIndex({ name: 'IDX_payment_methods_company', columnNames: ['company_id'] }));
      await queryRunner.createIndex('payment_methods', new TableIndex({ name: 'IDX_payment_methods_active', columnNames: ['is_active'] }));
      await queryRunner.createIndex('payment_methods', new TableIndex({ name: 'IDX_payment_methods_type', columnNames: ['type'] }));
      await queryRunner.createIndex('payment_methods', new TableIndex({ name: 'UK_payment_methods_company_code', columnNames: ['company_id', 'code'], isUnique: true }));
      await queryRunner.createForeignKey('payment_methods', new TableForeignKey({ columnNames: ['company_id'], referencedColumnNames: ['id'], referencedTableName: 'companies', onDelete: 'CASCADE' }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('payment_methods');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('company_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('payment_methods', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('payment_methods');
  }
}
