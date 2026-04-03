import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
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

async function seedCategories() {
  console.log('🌱 Seeding categories...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'monetrapos',
  });

  try {
    console.log('✓ Database connected\n');

    // Get admin company ID
    const companyId = '3cba3290-aeb5-4c83-a5f0-58a92b7c11b4';

    // Get first store for this company
    const [stores]: any = await connection.execute(
      'SELECT id, name FROM stores WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    if (stores.length === 0) {
      console.error('❌ No store found for company');
      console.log('   Please create a store first');
      await connection.end();
      process.exit(1);
    }

    const storeId = stores[0].id;
    console.log(`✓ Using store: ${stores[0].name}\n`);

    let created = 0;
    let skipped = 0;

    for (const cat of categories) {
      // Check if category exists
      const [existing]: any = await connection.execute(
        'SELECT id FROM categories WHERE name = ? AND company_id = ? AND store_id = ?',
        [cat.name, companyId, storeId]
      );

      if (existing.length === 0) {
        // Generate UUID
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

    console.log(`\n✅ Categories seeding complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${categories.length}\n`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    await connection.end();
    process.exit(1);
  }
}

seedCategories();
