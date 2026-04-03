import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRenewalNotificationTracking1711659959000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add subscription_id column to notifications table
    await queryRunner.addColumn(
      'notifications',
      new TableColumn({
        name: 'subscription_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    // Add channel column to notifications table
    await queryRunner.addColumn(
      'notifications',
      new TableColumn({
        name: 'channel',
        type: 'enum',
        enum: ['email', 'in_app', 'sms', 'whatsapp'],
        isNullable: true,
      }),
    );

    // Add scheduled_for column to notifications table
    await queryRunner.addColumn(
      'notifications',
      new TableColumn({
        name: 'scheduled_for',
        type: 'date',
        isNullable: true,
      }),
    );

    // Add sent_at column to notifications table
    await queryRunner.addColumn(
      'notifications',
      new TableColumn({
        name: 'sent_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add index for subscription_id
    await queryRunner.query(
      'CREATE INDEX idx_notifications_subscription_id ON notifications(subscription_id)',
    );

    // Add index for scheduled_for
    await queryRunner.query(
      'CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes (PostgreSQL syntax)
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_notifications_scheduled_for',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_notifications_subscription_id',
    );

    // Drop columns
    await queryRunner.dropColumn('notifications', 'sent_at');
    await queryRunner.dropColumn('notifications', 'scheduled_for');
    await queryRunner.dropColumn('notifications', 'channel');
    await queryRunner.dropColumn('notifications', 'subscription_id');
  }
}
