import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLaundryTables1711659975000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // All laundry tables already created by InitialSchema — skip if exists
    const lstExists = await queryRunner.hasTable('laundry_service_types');
    if (!lstExists) {
      await queryRunner.query(`
        CREATE TABLE laundry_service_types (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          service_type ENUM('wash_dry','wash_iron','dry_clean','iron_only') NOT NULL,
          description TEXT,
          pricing_type ENUM('per_kg','per_item') NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          estimated_hours INT DEFAULT 24,
          company_id VARCHAR(36) NOT NULL,
          is_active TINYINT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_laundry_service_types_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await queryRunner.query(`CREATE INDEX idx_laundry_service_types_company ON laundry_service_types(company_id)`);
    }

    const loExists = await queryRunner.hasTable('laundry_orders');
    if (!loExists) {
      await queryRunner.query(`
        CREATE TABLE laundry_orders (
          id VARCHAR(36) PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          status ENUM('received','washing','drying','ironing','ready','delivered','cancelled') NOT NULL DEFAULT 'received',
          company_id VARCHAR(36) NOT NULL,
          store_id VARCHAR(36) NOT NULL,
          customer_id VARCHAR(36) NOT NULL,
          service_type_id VARCHAR(36) NOT NULL,
          weight_kg DECIMAL(10,2),
          item_count INT DEFAULT 0,
          total_price DECIMAL(10,2) NOT NULL,
          notes TEXT,
          pickup_date TIMESTAMP NULL,
          delivery_date TIMESTAMP NULL,
          pickup_address VARCHAR(500),
          delivery_address VARCHAR(500),
          washing_started_at TIMESTAMP NULL,
          drying_started_at TIMESTAMP NULL,
          ironing_started_at TIMESTAMP NULL,
          ready_at TIMESTAMP NULL,
          delivered_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_laundry_orders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          CONSTRAINT fk_laundry_orders_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
          CONSTRAINT fk_laundry_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          CONSTRAINT fk_laundry_orders_service_type FOREIGN KEY (service_type_id) REFERENCES laundry_service_types(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await queryRunner.query(`CREATE INDEX idx_laundry_orders_company ON laundry_orders(company_id)`);
      await queryRunner.query(`CREATE INDEX idx_laundry_orders_status ON laundry_orders(status)`);
    }

    const liExists = await queryRunner.hasTable('laundry_items');
    if (!liExists) {
      await queryRunner.query(`
        CREATE TABLE laundry_items (
          id VARCHAR(36) PRIMARY KEY,
          order_id VARCHAR(36) NOT NULL,
          item_type ENUM('shirt','pants','dress','jacket','skirt','bedsheet','blanket','curtain','towel','other') NOT NULL,
          description VARCHAR(200),
          color VARCHAR(100),
          brand VARCHAR(100),
          quantity INT DEFAULT 1,
          barcode VARCHAR(50) UNIQUE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_laundry_items_order FOREIGN KEY (order_id) REFERENCES laundry_orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await queryRunner.query(`CREATE INDEX idx_laundry_items_order ON laundry_items(order_id)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS laundry_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS laundry_orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS laundry_service_types`);
  }
}
