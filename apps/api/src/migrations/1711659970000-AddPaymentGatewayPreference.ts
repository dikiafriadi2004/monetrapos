import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentGatewayPreference1711659970000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add payment_gateway_preference column to companies table
    await queryRunner.addColumn(
      'companies',
      new TableColumn({
        name: 'payment_gateway_preference',
        type: 'varchar',
        length: '20',
        isNullable: true,
        default: "'xendit'",
      }),
    );

    console.log('✓ Added payment_gateway_preference column to companies table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('companies', 'payment_gateway_preference');
  }
}
