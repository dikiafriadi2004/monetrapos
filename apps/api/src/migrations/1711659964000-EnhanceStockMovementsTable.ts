import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class EnhanceStockMovementsTable1711659964000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add variant_id column
    await queryRunner.addColumn(
      'stock_movements',
      new TableColumn({
        name: 'variant_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    // Add performed_by column
    await queryRunner.addColumn(
      'stock_movements',
      new TableColumn({
        name: 'performed_by',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    // Add foreign key for variant_id
    await queryRunner.createForeignKey(
      'stock_movements',
      new TableForeignKey({
        columnNames: ['variant_id'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key for performed_by
    await queryRunner.createForeignKey(
      'stock_movements',
      new TableForeignKey({
        columnNames: ['performed_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // PostgreSQL: Drop and recreate the type column with new enum values
    await queryRunner.query(`
      ALTER TABLE stock_movements 
      ALTER COLUMN type TYPE VARCHAR(20)
    `);
    
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type_enum') THEN
          CREATE TYPE stock_movement_type_enum AS ENUM('in', 'out', 'adjustment', 'return', 'sale', 'transfer');
        END IF;
      END $$;
    `);
    
    await queryRunner.query(`
      ALTER TABLE stock_movements 
      ALTER COLUMN type TYPE stock_movement_type_enum USING type::stock_movement_type_enum
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
