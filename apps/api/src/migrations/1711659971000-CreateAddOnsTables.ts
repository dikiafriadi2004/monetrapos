import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAddOnsTables1711659971000 implements MigrationInterface {
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
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'long_description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'enum',
            enum: ['integration', 'feature', 'support', 'capacity'],
          },
          {
            name: 'pricing_type',
            type: 'enum',
            enum: ['one_time', 'recurring'],
            default: "'recurring'",
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'coming_soon'],
            default: "'active'",
          },
          {
            name: 'icon_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'features',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'available_for_plans',
            type: 'json',
            default: "'[]'",
          },
          {
            name: 'metadata',
            type: 'json',
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

    // Create indexes for add_ons
    await queryRunner.createIndex(
      'add_ons',
      new TableIndex({
        name: 'IDX_ADD_ONS_CATEGORY',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'add_ons',
      new TableIndex({
        name: 'IDX_ADD_ONS_STATUS',
        columnNames: ['status'],
      }),
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
          },
          {
            name: 'add_on_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'pending_payment', 'expired', 'cancelled'],
            default: "'pending_payment'",
          },
          {
            name: 'purchase_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'invoice_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'payment_transaction_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'activated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'auto_renew',
            type: 'boolean',
            default: true,
          },
          {
            name: 'configuration',
            type: 'json',
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

    // Create indexes for company_add_ons
    await queryRunner.createIndex(
      'company_add_ons',
      new TableIndex({
        name: 'IDX_COMPANY_ADD_ONS_COMPANY_ADDON',
        columnNames: ['company_id', 'add_on_id'],
      }),
    );

    await queryRunner.createIndex(
      'company_add_ons',
      new TableIndex({
        name: 'IDX_COMPANY_ADD_ONS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'company_add_ons',
      new TableIndex({
        name: 'IDX_COMPANY_ADD_ONS_EXPIRES_AT',
        columnNames: ['expires_at'],
      }),
    );

    // Create foreign keys
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

    // Add company_add_on_id column to invoices table
    await queryRunner.query(`
      ALTER TABLE invoices 
      ADD COLUMN company_add_on_id VARCHAR(36) NULL AFTER add_on_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove company_add_on_id from invoices
    await queryRunner.query(`
      ALTER TABLE invoices DROP COLUMN company_add_on_id
    `);

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
