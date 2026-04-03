import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EnhanceSubscriptions1711659955000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add duration_months column
    await queryRunner.addColumn(
      'subscriptions',
      new TableColumn({
        name: 'duration_months',
        type: 'int',
        isNullable: true,
        comment: 'Subscription duration in months (1, 3, 6, 12)',
      }),
    );

    // Add grace_period_end_date column
    await queryRunner.addColumn(
      'subscriptions',
      new TableColumn({
        name: 'grace_period_end_date',
        type: 'date',
        isNullable: true,
        comment: 'End date of grace period (3 days after expiry)',
      }),
    );

    // Add start_date column (if not exists)
    const table = await queryRunner.getTable('subscriptions');
    const hasStartDate = table?.columns.find(
      (col) => col.name === 'start_date',
    );

    if (!hasStartDate) {
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
    const hasEndDate = table?.columns.find((col) => col.name === 'end_date');

    if (!hasEndDate) {
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

    // PostgreSQL: Update status enum
    await queryRunner.query(`
      ALTER TABLE subscriptions 
      ALTER COLUMN status TYPE VARCHAR(20)
    `);
    
    await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS subscription_status_enum CASCADE;
        CREATE TYPE subscription_status_enum AS ENUM('pending', 'trial', 'active', 'past_due', 'expired', 'suspended', 'cancelled');
      END $$;
    `);
    
    await queryRunner.query(`
      ALTER TABLE subscriptions 
      ALTER COLUMN status TYPE subscription_status_enum USING status::subscription_status_enum,
      ALTER COLUMN status SET NOT NULL
    `);

    // Add index for end_date for faster expiry checks
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date)
    `);

    // Add index for grace_period_end_date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period_end_date ON subscriptions(grace_period_end_date)
    `);

    // Add index for status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_subscriptions_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_subscriptions_grace_period_end_date`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_subscriptions_end_date`,
    );

    // Drop columns
    await queryRunner.dropColumn('subscriptions', 'grace_period_end_date');
    await queryRunner.dropColumn('subscriptions', 'duration_months');

    // Note: We don't drop start_date and end_date as they might have been there before
    // Note: Reverting enum changes is complex in PostgreSQL, skipping for down migration
  }
}
