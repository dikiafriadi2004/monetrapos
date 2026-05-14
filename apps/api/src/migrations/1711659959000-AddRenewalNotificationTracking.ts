import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRenewalNotificationTracking1711659959000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const notifTable = await queryRunner.getTable('notifications');

    if (!notifTable?.columns.find((c) => c.name === 'subscription_id')) {
      await queryRunner.addColumn('notifications', new TableColumn({ name: 'subscription_id', type: 'varchar', length: '36', isNullable: true }));
    }
    if (!notifTable?.columns.find((c) => c.name === 'channel')) {
      await queryRunner.addColumn('notifications', new TableColumn({ name: 'channel', type: 'enum', enum: ['email', 'in_app', 'sms', 'whatsapp'], isNullable: true }));
    }
    if (!notifTable?.columns.find((c) => c.name === 'scheduled_for')) {
      await queryRunner.addColumn('notifications', new TableColumn({ name: 'scheduled_for', type: 'date', isNullable: true }));
    }
    if (!notifTable?.columns.find((c) => c.name === 'sent_at')) {
      await queryRunner.addColumn('notifications', new TableColumn({ name: 'sent_at', type: 'timestamp', isNullable: true }));
    }

    const indexes = await queryRunner.query(`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'`);
    const indexNames = indexes.map((i: any) => i.INDEX_NAME);
    if (!indexNames.includes('idx_notifications_subscription_id')) {
      await queryRunner.query('CREATE INDEX idx_notifications_subscription_id ON notifications(subscription_id)');
    }
    if (!indexNames.includes('idx_notifications_scheduled_for')) {
      await queryRunner.query('CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for)');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes (MySQL syntax)
    await queryRunner.query(
      'DROP INDEX idx_notifications_scheduled_for ON notifications',
    );
    await queryRunner.query(
      'DROP INDEX idx_notifications_subscription_id ON notifications',
    );

    // Drop columns
    await queryRunner.dropColumn('notifications', 'sent_at');
    await queryRunner.dropColumn('notifications', 'scheduled_for');
    await queryRunner.dropColumn('notifications', 'channel');
    await queryRunner.dropColumn('notifications', 'subscription_id');
  }
}
