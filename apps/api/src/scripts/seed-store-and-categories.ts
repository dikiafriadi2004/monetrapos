import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const categories = [
  { name: 'Food & Beverages', description: 'Food and drink products', sortOrder: 1 },
  { name: 'Electronics', description: 'Electronic devices and accessories', sortOrder: 2 },
  { name: 'Clothing', description: 'Apparel and fashion items', sortOrder: 3 },
  { name: 'Home & Living', description: 'Home decor and living essentials', sortOrder: 4 },
  { name: 'Health & Beauty', description: 'Health and beauty products', sortOrder: 5 },
  { name: 'Office Supplies', description: 'Office and stationery items', sortOrder: 6 },
  { name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear', sortOrder: 7 },
  { name: 'Toys & Games', description: 'Toys, games, and entertainment', sortOrder: 8 },
];

async function seedStoreAndCategories() {
  console.log('🌱 Seeding store and categories...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'monetrapos',
  });

  try {
    console.log('✓ Database connected\n');

    const companyId = '3cba3290-aeb5-4c83-a5f0-58a92b7c11b4';

    // Check if store exists
    const [stores]: any = await connection.execute(
      'SELECT id, name FROM stores WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    let storeId: string;

    if (stores.length === 0) {
      // Create default store
      storeId = require('crypto').randomUUID();
      const now = new Date();

      await connection.execute(
        `INSERT INTO stores (id, name, address, phone, company_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [storeId, 'Main Store', 'Default Address', '0000000000', companyId, true, now, now]
      );

      console.log('✓ Created default store: Main Store\n');
    } else {
      storeId = stores[0].id;
      console.log(`✓ Using existing store: ${stores[0].name}\n`);
    }

    // Seed categories
    let created = 0;
    let skipped = 0;

    for (const cat of categories) {
      const [existing]: any = await connection.execute(
        'SELECT id FROM categories WHERE name = ? AND company_id = ? AND store_id = ?',
        [cat.name, companyId, storeId]
      );

      if (existing.length === 0) {
        const id = require('crypto').randomUUID();
        const slug = cat.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
        const now = new Date();

        await connection.execute(
          `INSERT INTO categories (id, name, slug, description, company_id, store_id, is_active, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, cat.name, slug, cat.description, companyId, storeId, true, cat.sortOrder, now, now]
        );

        console.log(`✓ Created category: ${cat.name}`);
        created++;
      } else {
        console.log(`- Category already exists: ${cat.name}`);
        skipped++;
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Categories created: ${created}`);
    console.log(`   Categories skipped: ${skipped}`);
    console.log(`   Total categories: ${categories.length}\n`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await connection.end();
    process.exit(1);
  }
}

seedStoreAndCategories();
