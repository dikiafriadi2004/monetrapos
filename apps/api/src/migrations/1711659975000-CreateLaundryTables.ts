import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLaundryTables1711659975000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create laundry_service_types table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS laundry_service_types (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        service_type VARCHAR(20) NOT NULL,
        description TEXT,
        pricing_type VARCHAR(20) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        estimated_hours INT DEFAULT 24,
        company_id VARCHAR(36) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_laundry_service_types_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT chk_service_type CHECK (service_type IN ('wash_dry', 'wash_iron', 'dry_clean', 'iron_only')),
        CONSTRAINT chk_pricing_type CHECK (pricing_type IN ('per_kg', 'per_item'))
      );
    `);

    // Create indexes for laundry_service_types
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_service_types_company ON laundry_service_types(company_id);
    `);

    // Create laundry_orders table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS laundry_orders (
        id VARCHAR(36) PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'received',
        company_id VARCHAR(36) NOT NULL,
        store_id VARCHAR(36) NOT NULL,
        customer_id VARCHAR(36) NOT NULL,
        service_type_id VARCHAR(36) NOT NULL,
        weight_kg DECIMAL(10, 2),
        item_count INT DEFAULT 0,
        total_price DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        pickup_date TIMESTAMP NOT NULL,
        delivery_date TIMESTAMP NOT NULL,
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
        CONSTRAINT fk_laundry_orders_service_type FOREIGN KEY (service_type_id) REFERENCES laundry_service_types(id) ON DELETE RESTRICT,
        CONSTRAINT chk_laundry_order_status CHECK (status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'delivered', 'cancelled'))
      );
    `);

    // Create indexes for laundry_orders
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_orders_company ON laundry_orders(company_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_orders_store ON laundry_orders(store_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_orders_customer ON laundry_orders(customer_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_orders_status ON laundry_orders(status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_orders_pickup_date ON laundry_orders(pickup_date);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_orders_delivery_date ON laundry_orders(delivery_date);
    `);

    // Create laundry_items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS laundry_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        item_type VARCHAR(20) NOT NULL,
        description VARCHAR(200),
        color VARCHAR(100),
        brand VARCHAR(100),
        quantity INT DEFAULT 1,
        barcode VARCHAR(50) UNIQUE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_laundry_items_order FOREIGN KEY (order_id) REFERENCES laundry_orders(id) ON DELETE CASCADE,
        CONSTRAINT chk_item_type CHECK (item_type IN ('shirt', 'pants', 'dress', 'jacket', 'skirt', 'bedsheet', 'blanket', 'curtain', 'towel', 'other'))
      );
    `);

    // Create indexes for laundry_items
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_items_order ON laundry_items(order_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_laundry_items_barcode ON laundry_items(barcode);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS laundry_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS laundry_orders CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS laundry_service_types CASCADE;`);
  }
}
