import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class EnhancePaymentTables1711659957000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add invoice_type column to invoices table
    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'invoice_type',
        type: 'enum',
        enum: ['subscription', 'add_on', 'renewal'],
        default: "'subscription'",
        comment: 'Type of invoice',
      }),
    );

    // Add invoice_pdf_url column to invoices table
    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'invoice_pdf_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
        comment: 'URL to invoice PDF file',
      }),
    );

    // Add add_on_id column to invoices table (for add-on invoices)
    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'add_on_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
        comment: 'Reference to company_add_ons table',
      }),
    );

    // Create payment_webhooks table for logging all webhook events
    await queryRunner.createTable(
      new Table({
        name: 'payment_webhooks',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'payment_gateway',
            type: 'enum',
            enum: ['midtrans', 'xendit'],
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Webhook event type',
          },
          {
            name: 'payload',
            type: 'json',
            isNullable: false,
            comment: 'Full webhook payload',
          },
          {
            name: 'signature',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Webhook signature for verification',
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
            comment: 'Whether signature was verified',
          },
          {
            name: 'is_processed',
            type: 'boolean',
            default: false,
            comment: 'Whether webhook was processed',
          },
          {
            name: 'processed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
            comment: 'Error message if processing failed',
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

    // Add indexes for payment_webhooks
    await queryRunner.createIndex(
      'payment_webhooks',
      new TableIndex({
        name: 'idx_payment_webhooks_gateway_event',
        columnNames: ['payment_gateway', 'event_type'],
      }),
    );

    await queryRunner.createIndex(
      'payment_webhooks',
      new TableIndex({
        name: 'idx_payment_webhooks_processed',
        columnNames: ['is_processed'],
      }),
    );

    await queryRunner.createIndex(
      'payment_webhooks',
      new TableIndex({
        name: 'idx_payment_webhooks_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop payment_webhooks table
    await queryRunner.dropTable('payment_webhooks');

    // Drop columns from invoices
    await queryRunner.dropColumn('invoices', 'add_on_id');
    await queryRunner.dropColumn('invoices', 'invoice_pdf_url');
    await queryRunner.dropColumn('invoices', 'invoice_type');
  }
}
