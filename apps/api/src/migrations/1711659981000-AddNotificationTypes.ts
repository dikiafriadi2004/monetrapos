import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTypes1711659981000 implements MigrationInterface {
  name = 'AddNotificationTypes1711659981000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Modify the notifications type enum to add low_stock and new_order
    await queryRunner.query(`
      ALTER TABLE notifications 
      MODIFY COLUMN type ENUM(
        'invoice','payment','subscription',
        'subscription_expiring','subscription_expired','subscription_suspended',
        'low_stock','new_order','system','alert'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications 
      MODIFY COLUMN type ENUM(
        'invoice','payment','subscription',
        'subscription_expiring','subscription_expired','subscription_suspended',
        'system','alert'
      ) NOT NULL
    `);
  }
}
