import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Complete System E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testData: {
    companyId?: string;
    userId?: string;
    subscriptionId?: string;
    invoiceId?: string;
    accessToken?: string;
    storeId?: string;
    categoryId?: string;
    productId?: string;
    customerId?: string;
    transactionId?: string;
    store2Id?: string;
  } = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testData.companyId) {
      await dataSource.query('DELETE FROM companies WHERE id = ?', [
        testData.companyId,
      ]);
    }

    await app.close();
  });

  describe('Flow 1: Registration → Payment → Activation', () => {
    it('should register a new company', async () => {
      const registrationDto = {
        companyName: 'E2E Test Company',
        companyEmail: `e2e-${Date.now()}@example.com`,
        companyPhone: '081234567890',
        companyAddress: 'Test Address 123',
        ownerName: 'John E2E',
        ownerEmail: `owner-e2e-${Date.now()}@example.com`,
        ownerPhone: '081234567891',
        password: 'Password123!',
        planId: 'plan-id-from-seeder', // TODO: Get from actual seeded plan
        durationMonths: 12,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register-company')
        .send(registrationDto)
        .expect(201);

      expect(response.body).toHaveProperty('companyId');
      expect(response.body).toHaveProperty('subscriptionId');
      expect(response.body).toHaveProperty('invoiceId');
      expect(response.body).toHaveProperty('paymentUrl');

      testData.companyId = response.body.companyId;
      testData.userId = response.body.userId;
      testData.subscriptionId = response.body.subscriptionId;
      testData.invoiceId = response.body.invoiceId;
    });

    it('should simulate payment and activate subscription', async () => {
      // Simulate payment webhook
      const webhookPayload = {
        transaction_id: `TXN-E2E-${Date.now()}`,
        order_id: testData.invoiceId,
        transaction_status: 'settlement',
        payment_type: 'credit_card',
        gross_amount: 1000000,
      };

      await request(app.getHttpServer())
        .post('/api/v1/billing/webhooks/midtrans')
        .send(webhookPayload)
        .expect(201);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify subscription activated
      const subscription = await dataSource.query(
        'SELECT * FROM subscriptions WHERE id = ?',
        [testData.subscriptionId],
      );

      expect(subscription[0].status).toBe('active');
      expect(subscription[0].start_date).not.toBeNull();
      expect(subscription[0].end_date).not.toBeNull();
    });

    it('should create default store', async () => {
      const stores = await dataSource.query(
        'SELECT * FROM stores WHERE company_id = ?',
        [testData.companyId],
      );

      expect(stores.length).toBeGreaterThan(0);
      testData.storeId = stores[0].id;
    });

    it('should allow login after activation', async () => {
      const user = await dataSource.query('SELECT * FROM users WHERE id = ?', [
        testData.userId,
      ]);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user[0].email,
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      testData.accessToken = response.body.accessToken;
    });
  });

  describe('Flow 2: Subscription Lifecycle', () => {
    it('should allow full access with active subscription', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should block write operations during grace period', async () => {
      // Set subscription to expired with grace period
      await dataSource.query(
        `UPDATE subscriptions 
         SET status = 'expired',
             end_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY),
             grace_period_end_date = DATE_ADD(CURDATE(), INTERVAL 2 DAY)
         WHERE id = ?`,
        [testData.subscriptionId],
      );

      await dataSource.query(
        `UPDATE companies 
         SET subscription_status = 'expired'
         WHERE id = ?`,
        [testData.companyId],
      );

      // GET should work
      await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .expect(200);

      // POST should fail
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          name: 'Test Product',
          sku: 'TEST-001',
          price: 10000,
        })
        .expect(403);

      // Restore active status for next tests
      await dataSource.query(
        `UPDATE subscriptions 
         SET status = 'active',
             end_date = DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         WHERE id = ?`,
        [testData.subscriptionId],
      );

      await dataSource.query(
        `UPDATE companies 
         SET subscription_status = 'active'
         WHERE id = ?`,
        [testData.companyId],
      );
    });
  });

  describe('Flow 3: POS Transaction with Inventory', () => {
    it('should create category', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          name: 'Beverages',
          slug: 'beverages',
        })
        .expect(201);

      testData.categoryId = response.body.id;
    });

    it('should create product with initial stock', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          name: 'Espresso',
          sku: 'BEV-ESP-001',
          categoryId: testData.categoryId,
          basePrice: 25000,
          trackInventory: true,
        })
        .expect(201);

      testData.productId = response.body.id;

      // Set initial stock
      await request(app.getHttpServer())
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          storeId: testData.storeId,
          productId: testData.productId,
          quantity: 100,
          type: 'in',
          reason: 'Initial stock',
        })
        .expect(201);
    });

    it('should verify initial inventory', async () => {
      const inventory = await dataSource.query(
        `SELECT * FROM inventory 
         WHERE store_id = ? AND product_id = ?`,
        [testData.storeId, testData.productId],
      );

      expect(inventory[0].quantity).toBe(100);
      expect(inventory[0].available_quantity).toBe(100);
    });

    it('should create transaction and reduce inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          storeId: testData.storeId,
          items: [
            {
              productId: testData.productId,
              quantity: 2,
              unitPrice: 25000,
            },
          ],
          payments: [
            {
              method: 'cash',
              amount: 50000,
            },
          ],
        })
        .expect(201);

      testData.transactionId = response.body.id;

      // Verify inventory reduced
      const inventory = await dataSource.query(
        `SELECT * FROM inventory 
         WHERE store_id = ? AND product_id = ?`,
        [testData.storeId, testData.productId],
      );

      expect(inventory[0].quantity).toBe(98);
    });

    it('should log inventory movement', async () => {
      const movements = await dataSource.query(
        `SELECT * FROM inventory_movements 
         WHERE product_id = ? AND type = 'sale'
         ORDER BY created_at DESC LIMIT 1`,
        [testData.productId],
      );

      expect(movements.length).toBeGreaterThan(0);
      expect(movements[0].quantity).toBe(-2);
      expect(movements[0].reference_type).toBe('transaction');
    });
  });

  describe('Flow 4: Multi-Store Operations', () => {
    it('should create second store', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/stores')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          name: 'Branch 2',
          code: 'BR2',
          address: 'Test Address Branch 2',
        })
        .expect(201);

      testData.store2Id = response.body.id;
    });

    it('should set initial stock for both stores', async () => {
      // Store 1: 50 units
      await request(app.getHttpServer())
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          storeId: testData.storeId,
          productId: testData.productId,
          quantity: -48, // Reduce from 98 to 50
          type: 'adjustment',
          reason: 'Set to 50 for test',
        })
        .expect(201);

      // Store 2: 30 units
      await request(app.getHttpServer())
        .post('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          storeId: testData.store2Id,
          productId: testData.productId,
          quantity: 30,
          type: 'in',
          reason: 'Initial stock for store 2',
        })
        .expect(201);
    });

    it('should transfer stock between stores', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/inventory/transfer')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          fromStoreId: testData.storeId,
          toStoreId: testData.store2Id,
          items: [
            {
              productId: testData.productId,
              quantity: 10,
            },
          ],
        })
        .expect(201);

      // Verify Store 1: 40 units
      const inventory1 = await dataSource.query(
        `SELECT * FROM inventory 
         WHERE store_id = ? AND product_id = ?`,
        [testData.storeId, testData.productId],
      );
      expect(inventory1[0].quantity).toBe(40);

      // Verify Store 2: 40 units
      const inventory2 = await dataSource.query(
        `SELECT * FROM inventory 
         WHERE store_id = ? AND product_id = ?`,
        [testData.store2Id, testData.productId],
      );
      expect(inventory2[0].quantity).toBe(40);
    });
  });

  describe('Flow 5: Customer Loyalty', () => {
    it('should create customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          phone: '081234567892',
        })
        .expect(201);

      testData.customerId = response.body.id;
    });

    it('should earn loyalty points on transaction', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          storeId: testData.storeId,
          customerId: testData.customerId,
          items: [
            {
              productId: testData.productId,
              quantity: 4,
              unitPrice: 25000,
            },
          ],
          payments: [
            {
              method: 'cash',
              amount: 100000,
            },
          ],
        })
        .expect(201);

      // Verify points earned (100,000 / 1,000 = 100 points)
      const customer = await dataSource.query(
        'SELECT * FROM customers WHERE id = ?',
        [testData.customerId],
      );

      expect(customer[0].loyalty_points).toBe(100);
    });

    it('should redeem loyalty points', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/customers/${testData.customerId}/points/redeem`)
        .set('Authorization', `Bearer ${testData.accessToken}`)
        .send({
          points: 50,
        })
        .expect(200);

      // Verify points deducted
      const customer = await dataSource.query(
        'SELECT * FROM customers WHERE id = ?',
        [testData.customerId],
      );

      expect(customer[0].loyalty_points).toBe(50);
    });

    it('should track loyalty point transactions', async () => {
      const transactions = await dataSource.query(
        `SELECT * FROM loyalty_point_transactions 
         WHERE customer_id = ?
         ORDER BY created_at DESC`,
        [testData.customerId],
      );

      expect(transactions.length).toBe(2); // 1 earn, 1 redeem
      expect(transactions[0].type).toBe('redeem');
      expect(transactions[0].points).toBe(-50);
      expect(transactions[1].type).toBe('earn');
      expect(transactions[1].points).toBe(100);
    });
  });

  describe('Integration: Complete User Journey', () => {
    it('should complete full journey from registration to transaction', async () => {
      // This test verifies all components work together
      // Already tested in previous flows, this is a summary check

      // 1. Company registered and activated
      const company = await dataSource.query(
        'SELECT * FROM companies WHERE id = ?',
        [testData.companyId],
      );
      expect(company[0].status).toBe('active');

      // 2. Subscription active
      const subscription = await dataSource.query(
        'SELECT * FROM subscriptions WHERE id = ?',
        [testData.subscriptionId],
      );
      expect(subscription[0].status).toBe('active');

      // 3. Stores created
      const stores = await dataSource.query(
        'SELECT * FROM stores WHERE company_id = ?',
        [testData.companyId],
      );
      expect(stores.length).toBe(2);

      // 4. Products created
      const products = await dataSource.query(
        'SELECT * FROM products WHERE company_id = ?',
        [testData.companyId],
      );
      expect(products.length).toBeGreaterThan(0);

      // 5. Inventory tracked
      const inventory = await dataSource.query(
        'SELECT * FROM inventory WHERE company_id = ?',
        [testData.companyId],
      );
      expect(inventory.length).toBeGreaterThan(0);

      // 6. Transactions recorded
      const transactions = await dataSource.query(
        'SELECT * FROM transactions WHERE company_id = ?',
        [testData.companyId],
      );
      expect(transactions.length).toBeGreaterThan(0);

      // 7. Customer created with loyalty points
      const customer = await dataSource.query(
        'SELECT * FROM customers WHERE id = ?',
        [testData.customerId],
      );
      expect(customer[0].loyalty_points).toBe(50);

      console.log('✅ Complete system integration test passed!');
    });
  });
});
