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
    const invoicesTable = await queryRunner.getTable('invoices');

    if (!invoicesTable?.columns.find((c) => c.name === 'invoice_type')) {
      await queryRunner.addColumn('invoices', new TableColumn({ name: 'invoice_type', type: 'enum', enum: ['subscription', 'add_on', 'renewal'], default: "'subscription'", comment: 'Type of invoice' }));
    }
    if (!invoicesTable?.columns.find((c) => c.name === 'invoice_pdf_url')) {
      await queryRunner.addColumn('invoices', new TableColumn({ name: 'invoice_pdf_url', type: 'varchar', length: '500', isNullable: true, comment: 'URL to invoice PDF file' }));
    }
    if (!invoicesTable?.columns.find((c) => c.name === 'add_on_id')) {
      await queryRunner.addColumn('invoices', new TableColumn({ name: 'add_on_id', type: 'varchar', length: '36', isNullable: true, comment: 'Reference to company_add_ons table' }));
    }

    // Create payment_webhooks table if not exists
    const webhooksExists = await queryRunner.hasTable('payment_webhooks');
    if (!webhooksExists) {
      await queryRunner.createTable(new Table({
        name: 'payment_webhooks',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid' },
          { name: 'payment_gateway', type: 'enum', enum: ['midtrans', 'xendit'], isNullable: false },
          { name: 'event_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'payload', type: 'json', isNullable: false },
          { name: 'signature', type: 'varchar', length: '500', isNullable: true },
          { name: 'is_verified', type: 'boolean', default: false },
          { name: 'is_processed', type: 'boolean', default: false },
          { name: 'processed_at', type: 'timestamp', isNullable: true },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }), true);

      await queryRunner.createIndex('payment_webhooks', new TableIndex({ name: 'idx_payment_webhooks_gateway_event', columnNames: ['payment_gateway', 'event_type'] }));
      await queryRunner.createIndex('payment_webhooks', new TableIndex({ name: 'idx_payment_webhooks_processed', columnNames: ['is_processed'] }));
      await queryRunner.createIndex('payment_webhooks', new TableIndex({ name: 'idx_payment_webhooks_created_at', columnNames: ['created_at'] }));
    }
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
