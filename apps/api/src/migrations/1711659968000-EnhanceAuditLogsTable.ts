import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class EnhanceAuditLogsTable1711659968000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.hasTable('audit_logs');
    
    if (!tableExists) {
      // If table doesn't exist, it will be created by TypeORM sync
      // This migration only handles enhancements to existing table
      return;
    }

    // Add company_id column if it doesn't exist
    const hasCompanyId = await queryRunner.hasColumn('audit_logs', 'company_id');
    if (!hasCompanyId) {
      await queryRunner.addColumn(
        'audit_logs',
        new TableColumn({
          name: 'company_id',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    // Add description column if it doesn't exist
    const hasDescription = await queryRunner.hasColumn('audit_logs', 'description');
    if (!hasDescription) {
      await queryRunner.addColumn(
        'audit_logs',
        new TableColumn({
          name: 'description',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    // Add metadata column if it doesn't exist
    const hasMetadata = await queryRunner.hasColumn('audit_logs', 'metadata');
    if (!hasMetadata) {
      await queryRunner.addColumn(
        'audit_logs',
        new TableColumn({
          name: 'metadata',
          type: 'json',
          isNullable: true,
        }),
      );
    }

    // Update action column length if needed
    const actionColumn = await queryRunner.getTable('audit_logs');
    const currentActionColumn = actionColumn?.columns.find(col => col.name === 'action');
    if (currentActionColumn && currentActionColumn.length !== '100') {
      await queryRunner.changeColumn(
        'audit_logs',
        'action',
        new TableColumn({
          name: 'action',
          type: 'varchar',
          length: '100',
          isNullable: false,
        }),
      );
    }

    // Update ip_address column length if needed
    const currentIpColumn = actionColumn?.columns.find(col => col.name === 'ip_address');
    if (currentIpColumn && currentIpColumn.length !== '100') {
      await queryRunner.changeColumn(
        'audit_logs',
        'ip_address',
        new TableColumn({
          name: 'ip_address',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
    }

    // Create indexes for better query performance
    const indexes = [
      new TableIndex({
        name: 'IDX_audit_logs_company_id',
        columnNames: ['company_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_user_id',
        columnNames: ['user_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_action',
        columnNames: ['action'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_entity_type',
        columnNames: ['entity_type'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_company_created',
        columnNames: ['company_id', 'created_at'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_company_action',
        columnNames: ['company_id', 'action'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_company_entity',
        columnNames: ['company_id', 'entity_type', 'entity_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_user_created',
        columnNames: ['user_id', 'created_at'],
      }),
    ];

    // Create indexes one by one, checking if they exist first
    for (const index of indexes) {
      try {
        const existingIndex = await queryRunner.getTable('audit_logs');
        const hasIndex = existingIndex?.indices.some(idx => idx.name === index.name);
        
        if (!hasIndex) {
          await queryRunner.createIndex('audit_logs', index);
        }
      } catch (error) {
        // Index might already exist, continue
        console.log(`Index ${index.name} might already exist, skipping...`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('audit_logs');
    
    if (!tableExists) {
      return;
    }

    // Drop indexes
    const indexNames = [
      'IDX_audit_logs_company_id',
      'IDX_audit_logs_user_id',
      'IDX_audit_logs_action',
      'IDX_audit_logs_entity_type',
      'IDX_audit_logs_company_created',
      'IDX_audit_logs_company_action',
      'IDX_audit_logs_company_entity',
      'IDX_audit_logs_user_created',
    ];

    for (const indexName of indexNames) {
      try {
        await queryRunner.dropIndex('audit_logs', indexName);
      } catch (error) {
        // Index might not exist, continue
      }
    }

    // Drop columns
    const hasMetadata = await queryRunner.hasColumn('audit_logs', 'metadata');
    if (hasMetadata) {
      await queryRunner.dropColumn('audit_logs', 'metadata');
    }

    const hasDescription = await queryRunner.hasColumn('audit_logs', 'description');
    if (hasDescription) {
      await queryRunner.dropColumn('audit_logs', 'description');
    }

    const hasCompanyId = await queryRunner.hasColumn('audit_logs', 'company_id');
    if (hasCompanyId) {
      await queryRunner.dropColumn('audit_logs', 'company_id');
    }
  }
}
