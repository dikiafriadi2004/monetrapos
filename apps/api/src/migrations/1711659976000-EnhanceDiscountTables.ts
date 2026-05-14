import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceDiscountTables1711659976000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to discounts table (MySQL syntax - add one by one to handle IF NOT EXISTS)
    const table = await queryRunner.getTable('discounts');

    const columnsToAdd: { name: string; sql: string }[] = [
      { name: 'description', sql: 'ALTER TABLE discounts ADD COLUMN description TEXT' },
      { name: 'promo_code', sql: 'ALTER TABLE discounts ADD COLUMN promo_code VARCHAR(50)' },
      { name: 'scope', sql: "ALTER TABLE discounts ADD COLUMN scope VARCHAR(20) DEFAULT 'all'" },
      { name: 'applicable_ids', sql: 'ALTER TABLE discounts ADD COLUMN applicable_ids TEXT' },
      { name: 'usage_limit', sql: 'ALTER TABLE discounts ADD COLUMN usage_limit INT' },
      { name: 'usage_count', sql: 'ALTER TABLE discounts ADD COLUMN usage_count INT DEFAULT 0' },
      { name: 'usage_limit_per_customer', sql: 'ALTER TABLE discounts ADD COLUMN usage_limit_per_customer INT' },
      { name: 'company_id', sql: 'ALTER TABLE discounts ADD COLUMN company_id VARCHAR(36)' },
    ];

    for (const col of columnsToAdd) {
      const exists = table?.columns.find((c) => c.name === col.name);
      if (!exists) {
        await queryRunner.query(col.sql);
      }
    }

    // Alter store_id to be nullable (MySQL syntax - must drop FK first)
    const discountsTable = await queryRunner.getTable('discounts');
    const storeIdFk = discountsTable?.foreignKeys.find((fk) => fk.columnNames.includes('store_id'));
    if (storeIdFk) {
      await queryRunner.dropForeignKey('discounts', storeIdFk);
    }
    await queryRunner.query(`ALTER TABLE discounts MODIFY COLUMN store_id VARCHAR(36) NULL;`);
    // Re-add FK if it existed
    if (storeIdFk) {
      await queryRunner.createForeignKey('discounts', storeIdFk);
    }

    // Add unique constraint for promo_code
    await queryRunner.query(`
      ALTER TABLE discounts ADD CONSTRAINT uq_discounts_promo_code UNIQUE (promo_code);
    `);

    // Remove old voucher_code column if exists
    const hasVoucherCode = table?.columns.find((c) => c.name === 'voucher_code');
    if (hasVoucherCode) {
      await queryRunner.query(`ALTER TABLE discounts DROP COLUMN voucher_code;`);
    }

    // Add foreign key for company_id
    await queryRunner.query(`
      ALTER TABLE discounts
      ADD CONSTRAINT fk_discounts_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    `);

    // Create indexes (MySQL does not support IF NOT EXISTS for indexes before 8.0.12, use try/catch pattern)
    await queryRunner.query(`CREATE INDEX idx_discounts_company ON discounts(company_id);`);
    await queryRunner.query(`CREATE INDEX idx_discounts_promo_code ON discounts(promo_code);`);
    // Note: column is isActive (camelCase) in this table
    await queryRunner.query(`CREATE INDEX idx_discounts_active ON discounts(isActive);`);
    await queryRunner.query(`CREATE INDEX idx_discounts_dates ON discounts(startDate, endDate);`);

    // Create discount_usages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS discount_usages (
        id VARCHAR(36) PRIMARY KEY,
        discount_id VARCHAR(36) NOT NULL,
        customer_id VARCHAR(36),
        transaction_id VARCHAR(36) NOT NULL,
        discount_amount DECIMAL(12, 2) NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_discount_usages_discount FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
        CONSTRAINT fk_discount_usages_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        CONSTRAINT fk_discount_usages_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_discount_usages_discount ON discount_usages(discount_id);`);
    await queryRunner.query(`CREATE INDEX idx_discount_usages_customer ON discount_usages(customer_id);`);
    await queryRunner.query(`CREATE INDEX idx_discount_usages_transaction ON discount_usages(transaction_id);`);
    await queryRunner.query(`CREATE INDEX idx_discount_usages_used_at ON discount_usages(used_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS discount_usages;`);

    // Drop foreign key first
    await queryRunner.query(`ALTER TABLE discounts DROP FOREIGN KEY fk_discounts_company;`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX idx_discounts_company ON discounts;`);
    await queryRunner.query(`DROP INDEX idx_discounts_promo_code ON discounts;`);
    await queryRunner.query(`DROP INDEX idx_discounts_active ON discounts;`);
    await queryRunner.query(`DROP INDEX idx_discounts_dates ON discounts;`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE discounts
      DROP COLUMN description,
      DROP COLUMN promo_code,
      DROP COLUMN scope,
      DROP COLUMN applicable_ids,
      DROP COLUMN usage_limit,
      DROP COLUMN usage_count,
      DROP COLUMN usage_limit_per_customer,
      DROP COLUMN company_id;
    `);
  }
}
