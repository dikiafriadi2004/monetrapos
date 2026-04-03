import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceDiscountTables1711659976000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to discounts table (PostgreSQL syntax)
    await queryRunner.query(`
      ALTER TABLE discounts
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'all',
      ADD COLUMN IF NOT EXISTS applicable_ids TEXT,
      ADD COLUMN IF NOT EXISTS usage_limit INT,
      ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS usage_limit_per_customer INT,
      ADD COLUMN IF NOT EXISTS company_id VARCHAR(36);
    `);
    
    // Alter store_id to be nullable
    await queryRunner.query(`
      ALTER TABLE discounts ALTER COLUMN store_id DROP NOT NULL;
    `);
    
    // Add unique constraint for promo_code
    await queryRunner.query(`
      ALTER TABLE discounts ADD CONSTRAINT uq_discounts_promo_code UNIQUE (promo_code);
    `);

    // Remove old voucher_code column if exists
    await queryRunner.query(`
      ALTER TABLE discounts DROP COLUMN IF EXISTS voucher_code;
    `);

    // Add foreign key for company_id
    await queryRunner.query(`
      ALTER TABLE discounts
      ADD CONSTRAINT fk_discounts_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    `);

    // Add check constraint for scope
    await queryRunner.query(`
      ALTER TABLE discounts
      ADD CONSTRAINT chk_discount_scope
      CHECK (scope IN ('all', 'category', 'product'));
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_company ON discounts(company_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_promo_code ON discounts(promo_code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_dates ON discounts(start_date, end_date);
    `);

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

    // Create indexes for discount_usages
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discount_usages_discount ON discount_usages(discount_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discount_usages_customer ON discount_usages(customer_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discount_usages_transaction ON discount_usages(transaction_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discount_usages_used_at ON discount_usages(used_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS discount_usages CASCADE;`);
    await queryRunner.query(`
      ALTER TABLE discounts
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS promo_code,
      DROP COLUMN IF EXISTS scope,
      DROP COLUMN IF EXISTS applicable_ids,
      DROP COLUMN IF EXISTS usage_limit,
      DROP COLUMN IF EXISTS usage_count,
      DROP COLUMN IF EXISTS usage_limit_per_customer,
      DROP COLUMN IF EXISTS company_id;
    `);
  }
}
