import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTransactionNumber1711659960000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add transaction_number column
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'transaction_number',
        type: 'varchar',
        length: '50',
        isNullable: true, // Temporarily nullable for existing records
        isUnique: false, // Will be unique after data migration
      }),
    );

    // Generate transaction numbers for existing records
    const transactions = await queryRunner.query(
      `SELECT id, store_id, created_at FROM transactions ORDER BY created_at ASC`,
    );

    const storeCounters: Record<string, Record<string, number>> = {};

    for (const tx of transactions) {
      const date = new Date(tx.created_at);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const key = `${tx.store_id}-${dateStr}`;

      if (!storeCounters[key]) {
        storeCounters[key] = { count: 0 };
      }

      storeCounters[key].count++;
      const seq = String(storeCounters[key].count).padStart(4, '0');
      const transactionNumber = `TRX-${dateStr}-${seq}`;

      await queryRunner.query(
        `UPDATE transactions SET transaction_number = ? WHERE id = ?`,
        [transactionNumber, tx.id],
      );
    }

    // Make column non-nullable and unique
    await queryRunner.changeColumn(
      'transactions',
      'transaction_number',
      new TableColumn({
        name: 'transaction_number',
        type: 'varchar',
        length: '50',
        isNullable: false,
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('transactions', 'transaction_number');
  }
}
