import { DataSource } from 'typeorm';
import { Category } from '../modules/products/category.entity';
import { Store } from '../modules/stores/store.entity';
import { Company } from '../modules/companies/company.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const categories = [
  {
    name: 'Food & Beverages',
    description: 'Food and drink products',
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Clothing',
    description: 'Apparel and fashion items',
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Home & Living',
    description: 'Home decor and living essentials',
    isActive: true,
    sortOrder: 4,
  },
  {
    name: 'Health & Beauty',
    description: 'Health and beauty products',
    isActive: true,
    sortOrder: 5,
  },
  {
    name: 'Office Supplies',
    description: 'Office and stationery items',
    isActive: true,
    sortOrder: 6,
  },
  {
    name: 'Sports & Outdoors',
    description: 'Sports equipment and outdoor gear',
    isActive: true,
    sortOrder: 7,
  },
  {
    name: 'Toys & Games',
    description: 'Toys, games, and entertainment',
    isActive: true,
    sortOrder: 8,
  },
];

async function seedCategories() {
  console.log('🌱 Seeding categories...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Category, Store, Company],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✓ Database connected\n');

    const categoryRepo = dataSource.getRepository(Category);
    const storeRepo = dataSource.getRepository(Store);

    // Get admin company ID (from admin seeder)
    const companyId = '3cba3290-aeb5-4c83-a5f0-58a92b7c11b4';

    // Get default store for this company
    const defaultStore = await storeRepo.findOne({
      where: { companyId },
    });

    if (!defaultStore) {
      console.error('❌ No store found for company');
      console.log('   Please create a store first');
      await dataSource.destroy();
      process.exit(1);
    }

    console.log(`✓ Using store: ${defaultStore.name}\n`);

    let created = 0;
    let skipped = 0;

    for (const cat of categories) {
      const existing = await categoryRepo.findOne({
        where: { name: cat.name, companyId, storeId: defaultStore.id },
      });

      if (!existing) {
        const category = categoryRepo.create({
          ...cat,
          slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
          companyId,
          storeId: defaultStore.id,
        });
        await categoryRepo.save(category);
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

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
