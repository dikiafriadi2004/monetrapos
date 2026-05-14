import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EnhanceSubscriptions1711659955000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('subscriptions');

    // Add duration_months column
    if (!table?.columns.find((c) => c.name === 'duration_months')) {
      await queryRunner.addColumn(
        'subscriptions',
        new TableColumn({
          name: 'duration_months',
          type: 'int',
          isNullable: true,
          comment: 'Subscription duration in months (1, 3, 6, 12)',
        }),
      );
    }

    // Add grace_period_end_date column
    if (!table?.columns.find((c) => c.name === 'grace_period_end_date')) {
      await queryRunner.addColumn(
        'subscriptions',
        new TableColumn({
          name: 'grace_period_end_date',
          type: 'date',
          isNullable: true,
          comment: 'End date of grace period (3 days after expiry)',
        }),
      );
    }

    // Add start_date column (if not exists)
    if (!table?.columns.find((col) => col.name === 'start_date')) {
      await queryRunner.addColumn(
        'subscriptions',
        new TableColumn({
          name: 'start_date',
          type: 'date',
          isNullable: true,
          comment: 'Subscription start date',
        }),
      );
    }

    // Add end_date column (if not exists)
    if (!table?.columns.find((col) => col.name === 'end_date')) {
      await queryRunner.addColumn(
        'subscriptions',
        new TableColumn({
          name: 'end_date',
          type: 'date',
          isNullable: true,
          comment: 'Subscription end date',
        }),
      );
    }

    // MySQL: Modify status column to include new enum values
    await queryRunner.query(`
      ALTER TABLE subscriptions 
      MODIFY COLUMN status ENUM('pending', 'trial', 'active', 'past_due', 'expired', 'suspended', 'cancelled') NOT NULL
    `);

    // Add indexes only if they don't exist
    const indexes = await queryRunner.query(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions'
    `);
    const indexNames = indexes.map((i: any) => i.INDEX_NAME);

    if (!indexNames.includes('idx_subscriptions_end_date')) {
      await queryRunner.query(`CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date)`);
    }
    if (!indexNames.includes('idx_subscriptions_grace_period_end_date')) {
      await queryRunner.query(`CREATE INDEX idx_subscriptions_grace_period_end_date ON subscriptions(grace_period_end_date)`);
    }
    if (!indexNames.includes('idx_subscriptions_status')) {
      await queryRunner.query(`CREATE INDEX idx_subscriptions_status ON subscriptions(status)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes (MySQL syntax)
    await queryRunner.query(
      `DROP INDEX idx_subscriptions_status ON subscriptions`,
    );
    await queryRunner.query(
      `DROP INDEX idx_subscriptions_grace_period_end_date ON subscriptions`,
    );
    await queryRunner.query(
      `DROP INDEX idx_subscriptions_end_date ON subscriptions`,
    );

    // Drop columns
    await queryRunner.dropColumn('subscriptions', 'grace_period_end_date');
    await queryRunner.dropColumn('subscriptions', 'duration_months');

    // Note: We don't drop start_date and end_date as they might have been there before
    // Note: Reverting enum changes is complex in PostgreSQL, skipping for down migration
  }
}
