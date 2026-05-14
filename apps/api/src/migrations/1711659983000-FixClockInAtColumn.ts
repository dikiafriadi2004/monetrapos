import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixClockInAtColumn1711659983000 implements MigrationInterface {
  name = 'FixClockInAtColumn1711659983000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hapus ON UPDATE CURRENT_TIMESTAMP dari clock_in_at
    // agar nilai clock_in_at tidak berubah saat row di-update (clock-out)
    await queryRunner.query(
      `ALTER TABLE employee_attendance MODIFY COLUMN clock_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE employee_attendance MODIFY COLUMN clock_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    );
  }
}
