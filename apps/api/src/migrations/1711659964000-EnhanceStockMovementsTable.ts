import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class EnhanceStockMovementsTable1711659964000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('stock_movements');

    // Add variant_id column
    if (!table?.columns.find((c) => c.name === 'variant_id')) {
      await queryRunner.addColumn(
        'stock_movements',
        new TableColumn({
          name: 'variant_id',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    // Add performed_by column
    if (!table?.columns.find((c) => c.name === 'performed_by')) {
      await queryRunner.addColumn(
        'stock_movements',
        new TableColumn({
          name: 'performed_by',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    // Add foreign key for variant_id only if not exists
    const refreshedTable = await queryRunner.getTable('stock_movements');
    const hasVariantFk = refreshedTable?.foreignKeys.some((fk) => fk.columnNames.includes('variant_id'));
    if (!hasVariantFk) {
      await queryRunner.createForeignKey(
        'stock_movements',
        new TableForeignKey({
          columnNames: ['variant_id'],
          referencedTableName: 'product_variants',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    // Add foreign key for performed_by only if not exists
    const hasPerformedByFk = refreshedTable?.foreignKeys.some((fk) => fk.columnNames.includes('performed_by'));
    if (!hasPerformedByFk) {
      await queryRunner.createForeignKey(
        'stock_movements',
        new TableForeignKey({
          columnNames: ['performed_by'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    // MySQL: Modify type column to include new enum values
    await queryRunner.query(`
      ALTER TABLE stock_movements 
      MODIFY COLUMN type ENUM('in', 'out', 'adjustment', 'return', 'sale', 'transfer') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('stock_movements');
    if (!table) {
      throw new Error('stock_movements table not found');
    }
    
    const variantFk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('variant_id') !== -1,
    );
    const performedByFk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('performed_by') !== -1,
    );

    if (variantFk) {
      await queryRunner.dropForeignKey('stock_movements', variantFk);
    }
    if (performedByFk) {
      await queryRunner.dropForeignKey('stock_movements', performedByFk);
    }

    // Drop columns
    await queryRunner.dropColumn('stock_movements', 'performed_by');
    await queryRunner.dropColumn('stock_movements', 'variant_id');

    // Note: Reverting enum changes is complex in PostgreSQL, skipping for down migration
  }
}
