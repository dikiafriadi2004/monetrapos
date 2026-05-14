import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFnbTables1711659974000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tables and fnb_orders are already created by InitialSchema migration — skip if exists
    const tablesExists = await queryRunner.hasTable('tables');
    if (!tablesExists) {
      await queryRunner.query(`
        CREATE TABLE tables (
          id VARCHAR(36) PRIMARY KEY,
          table_number VARCHAR(50) NOT NULL,
          table_name VARCHAR(100),
          capacity INT NOT NULL,
          status ENUM('available','occupied','reserved','cleaning') NOT NULL DEFAULT 'available',
          floor VARCHAR(100),
          section VARCHAR(100),
          position_x INT DEFAULT 0,
          position_y INT DEFAULT 0,
          company_id VARCHAR(36) NOT NULL,
          store_id VARCHAR(36) NOT NULL,
          current_transaction_id VARCHAR(36),
          is_active TINYINT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_tables_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          CONSTRAINT fk_tables_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
          CONSTRAINT fk_tables_transaction FOREIGN KEY (current_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await queryRunner.query(`CREATE INDEX idx_tables_company ON tables(company_id)`);
      await queryRunner.query(`CREATE INDEX idx_tables_store ON tables(store_id)`);
      await queryRunner.query(`CREATE INDEX idx_tables_status ON tables(status)`);
    }

    const fnbOrdersExists = await queryRunner.hasTable('fnb_orders');
    if (!fnbOrdersExists) {
      await queryRunner.query(`
        CREATE TABLE fnb_orders (
          id VARCHAR(36) PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          order_type ENUM('dine-in','takeaway','delivery') NOT NULL,
          status ENUM('pending','preparing','ready','served','completed','cancelled') NOT NULL DEFAULT 'pending',
          company_id VARCHAR(36) NOT NULL,
          store_id VARCHAR(36) NOT NULL,
          table_id VARCHAR(36),
          transaction_id VARCHAR(36),
          delivery_address TEXT,
          delivery_fee DECIMAL(10,2) DEFAULT 0,
          notes TEXT,
          preparing_at TIMESTAMP NULL,
          ready_at TIMESTAMP NULL,
          served_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_fnb_orders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          CONSTRAINT fk_fnb_orders_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
          CONSTRAINT fk_fnb_orders_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
          CONSTRAINT fk_fnb_orders_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await queryRunner.query(`CREATE INDEX idx_fnb_orders_company ON fnb_orders(company_id)`);
      await queryRunner.query(`CREATE INDEX idx_fnb_orders_store ON fnb_orders(store_id)`);
      await queryRunner.query(`CREATE INDEX idx_fnb_orders_status ON fnb_orders(status)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS fnb_orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS tables`);
  }
}
