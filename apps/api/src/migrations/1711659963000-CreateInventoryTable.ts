import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateInventoryTable1711659963000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create inventory table
    await queryRunner.createTable(
      new Table({
        name: 'inventory',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'company_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'store_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'variant_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'quantity',
            type: 'int',
            default: 0,
          },
          {
            name: 'reserved_quantity',
            type: 'int',
            default: 0,
          },
          {
            name: 'available_quantity',
            type: 'int',
            generatedType: 'STORED',
            asExpression: '(quantity - reserved_quantity)',
          },
          {
            name: 'last_restock_date',
            type: 'date',
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
            columnNames: ['company_id'],
            referencedTableName: 'companies',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['store_id'],
            referencedTableName: 'stores',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['product_id'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['variant_id'],
            referencedTableName: 'product_variants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create unique constraint
    await queryRunner.createIndex(
      'inventory',
      new TableIndex({
        name: 'unique_store_product_variant',
        columnNames: ['store_id', 'product_id', 'variant_id'],
        isUnique: true,
      }),
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'inventory',
      new TableIndex({
        name: 'idx_company_store',
        columnNames: ['company_id', 'store_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory',
      new TableIndex({
        name: 'idx_low_stock',
        columnNames: ['company_id', 'available_quantity'],
      }),
    );

    // Migrate existing Product.stock data to inventory table
    // Only for products that track inventory
    await queryRunner.query(`
      INSERT INTO inventory (
        id,
        company_id,
        store_id,
        product_id,
        variant_id,
        quantity,
        reserved_quantity,
        last_restock_date,
        created_at,
        updated_at
      )
      SELECT
        UUID(),
        p.company_id,
        p.store_id,
        p.id,
        NULL,
        p.stock,
        0,
        NULL,
        NOW(),
        NOW()
      FROM products p
      WHERE p.track_inventory = true
        AND p.deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('inventory', 'idx_low_stock');
    await queryRunner.dropIndex('inventory', 'idx_company_store');
    await queryRunner.dropIndex('inventory', 'unique_store_product_variant');

    // Drop table
    await queryRunner.dropTable('inventory');
  }
}
