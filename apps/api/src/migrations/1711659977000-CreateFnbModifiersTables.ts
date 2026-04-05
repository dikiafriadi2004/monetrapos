import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateFnbModifiersTables1711659977000 implements MigrationInterface {
  name = 'CreateFnbModifiersTables1711659977000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create fnb_modifier_groups table
    await queryRunner.createTable(
      new Table({
        name: 'fnb_modifier_groups',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: 'UUID()' },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'type', type: 'enum', enum: ['single', 'multiple'], default: "'single'" },
          { name: 'required', type: 'tinyint', default: 0 },
          { name: 'min_selections', type: 'int', default: 1 },
          { name: 'max_selections', type: 'int', isNullable: true },
          { name: 'is_active', type: 'tinyint', default: 1 },
          { name: 'product_ids', type: 'text', isNullable: true, comment: 'JSON array of product IDs' },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Create fnb_modifier_options table
    await queryRunner.createTable(
      new Table({
        name: 'fnb_modifier_options',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: 'UUID()' },
          { name: 'group_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'additional_price', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'is_available', type: 'tinyint', default: 1 },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Add indexes
    await queryRunner.createIndex('fnb_modifier_groups', new TableIndex({
      name: 'IDX_fnb_modifier_groups_company_id',
      columnNames: ['company_id'],
    }));

    await queryRunner.createIndex('fnb_modifier_options', new TableIndex({
      name: 'IDX_fnb_modifier_options_group_id',
      columnNames: ['group_id'],
    }));

    // Add foreign keys
    await queryRunner.createForeignKey('fnb_modifier_groups', new TableForeignKey({
      name: 'FK_fnb_modifier_groups_company',
      columnNames: ['company_id'],
      referencedTableName: 'companies',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));

    await queryRunner.createForeignKey('fnb_modifier_options', new TableForeignKey({
      name: 'FK_fnb_modifier_options_group',
      columnNames: ['group_id'],
      referencedTableName: 'fnb_modifier_groups',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('fnb_modifier_options', true);
    await queryRunner.dropTable('fnb_modifier_groups', true);
  }
}
