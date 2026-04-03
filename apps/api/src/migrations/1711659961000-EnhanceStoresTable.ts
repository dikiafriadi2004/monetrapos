import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class EnhanceStoresTable1711659961000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if manager_id column exists, if not add it
    const table = await queryRunner.getTable('stores');
    const managerIdColumn = table?.findColumnByName('manager_id');

    if (!managerIdColumn) {
      await queryRunner.addColumn(
        'stores',
        new TableColumn({
          name: 'manager_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      // Add foreign key constraint
      await queryRunner.createForeignKey(
        'stores',
        new TableForeignKey({
          columnNames: ['manager_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'SET NULL',
        }),
      );
    }

    // Rename operational_hours to opening_hours if it exists
    const operationalHoursColumn = table?.findColumnByName('operational_hours');
    if (operationalHoursColumn) {
      await queryRunner.renameColumn(table!, 'operational_hours', 'opening_hours');
    }

    // Ensure code column exists
    const codeColumn = table?.findColumnByName('code');
    if (!codeColumn) {
      await queryRunner.addColumn(
        'stores',
        new TableColumn({
          name: 'code',
          type: 'varchar',
          length: '50',
          isNullable: true,
        }),
      );
    }

    // Ensure city column exists
    const cityColumn = table?.findColumnByName('city');
    if (!cityColumn) {
      await queryRunner.addColumn(
        'stores',
        new TableColumn({
          name: 'city',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
    }

    // Ensure province column exists
    const provinceColumn = table?.findColumnByName('province');
    if (!provinceColumn) {
      await queryRunner.addColumn(
        'stores',
        new TableColumn({
          name: 'province',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
    }

    // Ensure postal_code column exists
    const postalCodeColumn = table?.findColumnByName('postal_code');
    if (!postalCodeColumn) {
      await queryRunner.addColumn(
        'stores',
        new TableColumn({
          name: 'postal_code',
          type: 'varchar',
          length: '10',
          isNullable: true,
        }),
      );
    }

    // Ensure email column exists
    const emailColumn = table?.findColumnByName('email');
    if (!emailColumn) {
      await queryRunner.addColumn(
        'stores',
        new TableColumn({
          name: 'email',
          type: 'varchar',
          length: '100',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('stores');

    // Remove foreign key
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('manager_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('stores', foreignKey);
    }

    // Drop manager_id column
    const managerIdColumn = table?.findColumnByName('manager_id');
    if (managerIdColumn) {
      await queryRunner.dropColumn('stores', 'manager_id');
    }

    // Rename opening_hours back to operational_hours
    const openingHoursColumn = table?.findColumnByName('opening_hours');
    if (openingHoursColumn) {
      await queryRunner.renameColumn(table!, 'opening_hours', 'operational_hours');
    }
  }
}
