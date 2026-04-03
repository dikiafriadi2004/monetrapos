import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAddOnsTables1711659958000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create add_ons table
    await queryRunner.createTable(
      new Table({
        name: 'add_ons',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'enum',
            enum: ['integration', 'feature', 'support', 'capacity'],
            isNullable: false,
          },
          {
            name: 'price_monthly',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'is_recurring',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'available_for_plans',
            type: 'json',
            isNullable: true,
            comment: 'Array of plan IDs, null = all plans',
          },
          {
            name: 'metadata',
            type: 'json',
            default: "'{}'",
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create company_add_ons table
    await queryRunner.createTable(
      new Table({
        name: 'company_add_ons',
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
            isNullable: false,
          },
          {
            name: 'add_on_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'cancelled', 'expired'],
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'is_auto_renew',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metadata',
            type: 'json',
            default: "'{}'",
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'company_add_ons',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'companies',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'company_add_ons',
      new TableForeignKey({
        columnNames: ['add_on_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'add_ons',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes
    await queryRunner.createIndex(
      'company_add_ons',
      new TableIndex({
        name: 'idx_unique_company_addon',
        columnNames: ['company_id', 'add_on_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'company_add_ons',
      new TableIndex({
        name: 'idx_company_add_ons_status',
        columnNames: ['company_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'add_ons',
      new TableIndex({
        name: 'idx_add_ons_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'add_ons',
      new TableIndex({
        name: 'idx_add_ons_active',
        columnNames: ['is_active'],
      }),
    );

    // Seed some default add-ons
    await queryRunner.query(`
      INSERT INTO add_ons (id, name, slug, description, category, price_monthly, is_recurring, is_active)
      VALUES
        (UUID(), 'WhatsApp Notifications', 'whatsapp-notifications', 'Send notifications via WhatsApp Business API', 'integration', 50000, true, true),
        (UUID(), 'Advanced Analytics', 'advanced-analytics', 'Advanced reporting and analytics dashboard', 'feature', 150000, true, true),
        (UUID(), 'Multi Warehouse', 'multi-warehouse', 'Manage multiple warehouses and stock locations', 'feature', 200000, true, true),
        (UUID(), 'Priority Support', 'priority-support', '24/7 priority customer support', 'support', 300000, true, true),
        (UUID(), 'Accounting Integration', 'accounting-integration', 'Integration with Jurnal.id and Accurate', 'integration', 100000, true, true),
        (UUID(), 'Custom Report Builder', 'custom-report-builder', 'Build custom reports with drag-and-drop', 'feature', 100000, true, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const companyAddOnsTable = await queryRunner.getTable('company_add_ons');
    const foreignKeys = companyAddOnsTable?.foreignKeys || [];

    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('company_add_ons', foreignKey);
    }

    // Drop tables
    await queryRunner.dropTable('company_add_ons');
    await queryRunner.dropTable('add_ons');
  }
}
