import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePurchaseOrdersTables1711659973000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const poExists = await queryRunner.hasTable('purchase_orders');
    await queryRunner.createTable(new Table({
      name: 'purchase_orders',
      columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid' },
        { name: 'company_id', type: 'varchar', length: '36' },
        { name: 'po_number', type: 'varchar', length: '50', isUnique: true },
        { name: 'supplier_id', type: 'varchar', length: '36' },
        { name: 'store_id', type: 'varchar', length: '36' },
        { name: 'created_by', type: 'varchar', length: '36', isNullable: true },
        { name: 'status', type: 'enum', enum: ['draft', 'sent', 'received', 'cancelled'], default: "'draft'" },
        { name: 'order_date', type: 'date' },
        { name: 'expected_delivery_date', type: 'date', isNullable: true },
        { name: 'received_date', type: 'date', isNullable: true },
        { name: 'received_by', type: 'varchar', length: '36', isNullable: true },
        { name: 'subtotal', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 0 },
        { name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'discount_amount', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'shipping_cost', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'total', type: 'decimal', precision: 15, scale: 2, default: 0 },
        { name: 'notes', type: 'text', isNullable: true },
        { name: 'terms_and_conditions', type: 'text', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    if (!poExists) {
      await queryRunner.createIndex('purchase_orders', new TableIndex({ name: 'IDX_PO_COMPANY_ID', columnNames: ['company_id'] }));
      await queryRunner.createIndex('purchase_orders', new TableIndex({ name: 'IDX_PO_SUPPLIER_ID', columnNames: ['supplier_id'] }));
      await queryRunner.createIndex('purchase_orders', new TableIndex({ name: 'IDX_PO_STORE_ID', columnNames: ['store_id'] }));
      await queryRunner.createIndex('purchase_orders', new TableIndex({ name: 'IDX_PO_NUMBER', columnNames: ['po_number'], isUnique: true }));
      await queryRunner.createIndex('purchase_orders', new TableIndex({ name: 'IDX_PO_STATUS', columnNames: ['status'] }));
      await queryRunner.createForeignKey('purchase_orders', new TableForeignKey({ columnNames: ['company_id'], referencedColumnNames: ['id'], referencedTableName: 'companies', onDelete: 'CASCADE' }));
      await queryRunner.createForeignKey('purchase_orders', new TableForeignKey({ columnNames: ['supplier_id'], referencedColumnNames: ['id'], referencedTableName: 'suppliers', onDelete: 'RESTRICT' }));
      await queryRunner.createForeignKey('purchase_orders', new TableForeignKey({ columnNames: ['store_id'], referencedColumnNames: ['id'], referencedTableName: 'stores', onDelete: 'RESTRICT' }));
      await queryRunner.createForeignKey('purchase_orders', new TableForeignKey({ columnNames: ['created_by'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'SET NULL' }));
      await queryRunner.createForeignKey('purchase_orders', new TableForeignKey({ columnNames: ['received_by'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'SET NULL' }));
    }

    const poiExists = await queryRunner.hasTable('purchase_order_items');
    await queryRunner.createTable(new Table({
      name: 'purchase_order_items',
      columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid' },
        { name: 'purchase_order_id', type: 'varchar', length: '36' },
        { name: 'product_id', type: 'varchar', length: '36' },
        { name: 'product_name', type: 'varchar', length: '200' },
        { name: 'product_sku', type: 'varchar', length: '100', isNullable: true },
        { name: 'quantity_ordered', type: 'int' },
        { name: 'quantity_received', type: 'int', default: 0 },
        { name: 'unit', type: 'varchar', length: '50', isNullable: true },
        { name: 'unit_price', type: 'decimal', precision: 15, scale: 2 },
        { name: 'total_price', type: 'decimal', precision: 15, scale: 2 },
        { name: 'notes', type: 'text', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    if (!poiExists) {
      await queryRunner.createIndex('purchase_order_items', new TableIndex({ name: 'IDX_POI_PURCHASE_ORDER_ID', columnNames: ['purchase_order_id'] }));
      await queryRunner.createIndex('purchase_order_items', new TableIndex({ name: 'IDX_POI_PRODUCT_ID', columnNames: ['product_id'] }));
      await queryRunner.createForeignKey('purchase_order_items', new TableForeignKey({ columnNames: ['purchase_order_id'], referencedColumnNames: ['id'], referencedTableName: 'purchase_orders', onDelete: 'CASCADE' }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.dropTable('purchase_order_items', true);
    await queryRunner.dropTable('purchase_orders', true);
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
