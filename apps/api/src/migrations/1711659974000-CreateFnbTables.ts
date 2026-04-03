import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFnbTables1711659974000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tables table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        table_number VARCHAR(50) NOT NULL,
        table_name VARCHAR(100),
        capacity INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'available',
        floor VARCHAR(100),
        section VARCHAR(100),
        position_x INT DEFAULT 0,
        position_y INT DEFAULT 0,
        company_id UUID NOT NULL,
        store_id UUID NOT NULL,
        current_transaction_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tables_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_tables_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        CONSTRAINT fk_tables_transaction FOREIGN KEY (current_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
        CONSTRAINT chk_table_status CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning'))
      );
    `);

    // Create indexes for tables
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tables_company ON tables(company_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tables_store ON tables(store_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tables_floor ON tables(floor);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tables_section ON tables(section);
    `);

    // Create fnb_orders table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fnb_orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        order_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        company_id UUID NOT NULL,
        store_id UUID NOT NULL,
        table_id UUID,
        transaction_id UUID,
        delivery_address TEXT,
        delivery_fee DECIMAL(10, 2) DEFAULT 0,
        notes TEXT,
        preparing_at TIMESTAMP,
        ready_at TIMESTAMP,
        served_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_fnb_orders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_fnb_orders_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        CONSTRAINT fk_fnb_orders_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
        CONSTRAINT fk_fnb_orders_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
        CONSTRAINT chk_order_type CHECK (order_type IN ('dine-in', 'takeaway', 'delivery')),
        CONSTRAINT chk_order_status CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'))
      );
    `);

    // Create indexes for fnb_orders
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fnb_orders_company ON fnb_orders(company_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fnb_orders_store ON fnb_orders(store_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fnb_orders_status ON fnb_orders(status);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fnb_orders_type ON fnb_orders(order_type);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fnb_orders_table ON fnb_orders(table_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fnb_orders_created ON fnb_orders(created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS fnb_orders CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tables CASCADE;`);
  }
}
