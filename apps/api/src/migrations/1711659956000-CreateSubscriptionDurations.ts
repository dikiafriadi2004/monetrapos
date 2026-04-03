import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSubscriptionDurations1711659956000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create subscription_durations table
    await queryRunner.createTable(
      new Table({
        name: 'subscription_durations',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'plan_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'duration_months',
            type: 'int',
            isNullable: false,
            comment: 'Duration in months: 1, 3, 6, 12',
          },
          {
            name: 'discount_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            comment: 'Discount percentage: 0, 5, 10, 20',
          },
          {
            name: 'final_price',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
            comment: 'Final price after discount',
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

    // Add foreign key to subscription_plans
    await queryRunner.createForeignKey(
      'subscription_durations',
      new TableForeignKey({
        columnNames: ['plan_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'subscription_plans',
        onDelete: 'CASCADE',
      }),
    );

    // Add unique constraint for plan_id + duration_months
    await queryRunner.createIndex(
      'subscription_durations',
      new TableIndex({
        name: 'idx_unique_plan_duration',
        columnNames: ['plan_id', 'duration_months'],
        isUnique: true,
      }),
    );

    // Seed default durations for existing plans
    // Note: This assumes you have plans with specific IDs or you'll need to adjust
    await queryRunner.query(`
      INSERT INTO subscription_durations (id, plan_id, duration_months, discount_percentage, final_price)
      SELECT 
        UUID() as id,
        sp.id as plan_id,
        durations.duration_months,
        durations.discount_percentage,
        ROUND(sp.price_monthly * durations.duration_months * (1 - durations.discount_percentage / 100), 2) as final_price
      FROM subscription_plans sp
      CROSS JOIN (
        SELECT 1 as duration_months, 0 as discount_percentage
        UNION ALL SELECT 3, 5
        UNION ALL SELECT 6, 10
        UNION ALL SELECT 12, 20
      ) as durations
      WHERE sp.deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('subscription_durations');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('plan_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('subscription_durations', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('subscription_durations');
  }
}
