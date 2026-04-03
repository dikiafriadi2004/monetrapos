import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EnhanceCategoriesTable1711659962000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if categories table exists
    const tableExists = await queryRunner.hasTable('categories');
    if (!tableExists) {
      console.log('Categories table does not exist, skipping migration');
      return;
    }

    // Add company_id column if not exists
    const hasCompanyId = await queryRunner.hasColumn('categories', 'company_id');
    if (!hasCompanyId) {
      await queryRunner.addColumn(
        'categories',
        new TableColumn({
          name: 'company_id',
          type: 'uuid',
          isNullable: true, // Temporarily nullable for migration
        }),
      );

      // Set company_id from store's company_id
      await queryRunner.query(`
        UPDATE categories c
        SET company_id = s.company_id
        FROM stores s
        WHERE c.store_id = s.id
      `);

      // Make it non-nullable after data migration
      await queryRunner.changeColumn(
        'categories',
        'company_id',
        new TableColumn({
          name: 'company_id',
          type: 'uuid',
          isNullable: false,
        }),
      );

      // Add index
      await queryRunner.query(`
        CREATE INDEX "idx_categories_company_id" ON "categories" ("company_id")
      `);
    }

    // Add slug column if not exists
    const hasSlug = await queryRunner.hasColumn('categories', 'slug');
    if (!hasSlug) {
      await queryRunner.addColumn(
        'categories',
        new TableColumn({
          name: 'slug',
          type: 'varchar',
          length: '255',
          isNullable: true, // Temporarily nullable
        }),
      );

      // Generate slugs from names
      await queryRunner.query(`
        UPDATE categories
        SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
      `);

      // Make it non-nullable
      await queryRunner.changeColumn(
        'categories',
        'slug',
        new TableColumn({
          name: 'slug',
          type: 'varchar',
          length: '255',
          isNullable: false,
        }),
      );
    }

    // Add parent_id column if not exists (for nested categories)
    const hasParentId = await queryRunner.hasColumn('categories', 'parent_id');
    if (!hasParentId) {
      await queryRunner.addColumn(
        'categories',
        new TableColumn({
          name: 'parent_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      // Add foreign key
      await queryRunner.query(`
        ALTER TABLE "categories"
        ADD CONSTRAINT "fk_categories_parent"
        FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
        ON DELETE SET NULL
      `);

      // Add index
      await queryRunner.query(`
        CREATE INDEX "idx_categories_parent_id" ON "categories" ("parent_id")
      `);
    }

    // Rename image to image_url if needed
    const hasImage = await queryRunner.hasColumn('categories', 'image');
    const hasImageUrl = await queryRunner.hasColumn('categories', 'image_url');
    if (hasImage && !hasImageUrl) {
      await queryRunner.renameColumn('categories', 'image', 'image_url');
      
      // Update column type to match design
      await queryRunner.changeColumn(
        'categories',
        'image_url',
        new TableColumn({
          name: 'image_url',
          type: 'varchar',
          length: '500',
          isNullable: true,
        }),
      );
    }

    // Rename sortOrder to sort_order if needed
    const hasSortOrder = await queryRunner.hasColumn('categories', 'sortOrder');
    const hasSortOrderSnake = await queryRunner.hasColumn('categories', 'sort_order');
    if (hasSortOrder && !hasSortOrderSnake) {
      await queryRunner.renameColumn('categories', 'sortOrder', 'sort_order');
    }

    // Rename isActive to is_active if needed
    const hasIsActive = await queryRunner.hasColumn('categories', 'isActive');
    const hasIsActiveSnake = await queryRunner.hasColumn('categories', 'is_active');
    if (hasIsActive && !hasIsActiveSnake) {
      await queryRunner.renameColumn('categories', 'isActive', 'is_active');
    }

    // Add composite index for company_id + slug uniqueness
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_categories_company_slug" 
      ON "categories" ("company_id", "slug")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('categories');
    if (!tableExists) {
      return;
    }

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_company_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_parent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_company_id"`);

    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "fk_categories_parent"
    `);

    // Drop columns
    await queryRunner.dropColumn('categories', 'parent_id');
    await queryRunner.dropColumn('categories', 'slug');
    await queryRunner.dropColumn('categories', 'company_id');

    // Revert column renames
    const hasImageUrl = await queryRunner.hasColumn('categories', 'image_url');
    if (hasImageUrl) {
      await queryRunner.renameColumn('categories', 'image_url', 'image');
    }

    const hasSortOrderSnake = await queryRunner.hasColumn('categories', 'sort_order');
    if (hasSortOrderSnake) {
      await queryRunner.renameColumn('categories', 'sort_order', 'sortOrder');
    }

    const hasIsActiveSnake = await queryRunner.hasColumn('categories', 'is_active');
    if (hasIsActiveSnake) {
      await queryRunner.renameColumn('categories', 'is_active', 'isActive');
    }
  }
}
