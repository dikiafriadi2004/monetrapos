import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEmailConfigsTable1711659978000 implements MigrationInterface {
  name = 'CreateEmailConfigsTable1711659978000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_configs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'UUID()',
          },
          {
            name: 'provider',
            type: 'enum',
            enum: ['mailtrap', 'gmail', 'smtp'],
            default: "'mailtrap'",
          },
          {
            name: 'is_enabled',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'host',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'port',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'secure',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'username',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'password',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'from_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'from_email',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'oauth_client_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'oauth_client_secret',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'oauth_refresh_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'email_configs',
      new TableIndex({
        name: 'IDX_email_configs_provider',
        columnNames: ['provider'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'email_configs',
      new TableIndex({
        name: 'IDX_email_configs_is_enabled',
        columnNames: ['is_enabled'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_configs', true);
  }
}
