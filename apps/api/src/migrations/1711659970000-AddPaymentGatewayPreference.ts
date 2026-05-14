import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentGatewayPreference1711659970000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('companies', 'payment_gateway_preference');
    if (hasColumn) return;

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('companies', 'payment_gateway_preference');
  }
}
