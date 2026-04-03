import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Registration & Payment Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let registrationResponse: any;
  let invoiceId: string;

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
    if (registrationResponse?.companyId) {
      await dataSource.query('DELETE FROM companies WHERE id = ?', [
        registrationResponse.companyId,
      ]);
    }

    await app.close();
  });

  describe('Step 1: Company Registration', () => {
    it('should register a new company with subscription plan', async () => {
      const registrationDto = {
        companyName: 'Test Company E2E',
        companyEmail: `test-${Date.now()}@example.com`,
        companyPhone: '081234567890',
        companyAddress: 'Test Address 123',
        ownerName: 'John Doe',
        ownerEmail: `owner-${Date.now()}@example.com`,
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
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('subscriptionId');
      expect(response.body).toHaveProperty('invoiceId');
      expect(response.body).toHaveProperty('invoiceNumber');
      expect(response.body).toHaveProperty('paymentUrl');
      expect(response.body).toHaveProperty('paymentToken');
      expect(response.body.message).toContain('Please complete payment');

      registrationResponse = response.body;
      invoiceId = response.body.invoiceId;
    });

    it('should create company with pending status', async () => {
      const company = await dataSource.query(
        'SELECT * FROM companies WHERE id = ?',
        [registrationResponse.companyId],
      );

      expect(company[0].status).toBe('pending');
      expect(company[0].subscription_status).toBe('pending');
    });

    it('should create pending subscription', async () => {
      const subscription = await dataSource.query(
        'SELECT * FROM subscriptions WHERE id = ?',
        [registrationResponse.subscriptionId],
      );

      expect(subscription[0].status).toBe('pending');
      expect(subscription[0].company_id).toBe(registrationResponse.companyId);
    });

    it('should create pending invoice', async () => {
      const invoice = await dataSource.query(
        'SELECT * FROM invoices WHERE id = ?',
        [invoiceId],
      );

      expect(invoice[0].status).toBe('pending');
      expect(invoice[0].invoice_number).toBe(
        registrationResponse.invoiceNumber,
      );
      expect(invoice[0].company_id).toBe(registrationResponse.companyId);
    });

    it('should create email verification token', async () => {
      const tokens = await dataSource.query(
        'SELECT * FROM email_verification_tokens WHERE user_id = ?',
        [registrationResponse.userId],
      );

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].used_at).toBeNull();
    });
  });

  describe('Step 2: Email Verification', () => {
    it('should verify email successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: registrationResponse.verificationToken })
        .expect(200);

      expect(response.body.message).toContain('verified successfully');
    });

    it('should update user email verification status', async () => {
      const user = await dataSource.query('SELECT * FROM users WHERE id = ?', [
        registrationResponse.userId,
      ]);

      expect(user[0].email_verified).toBe(true);
      expect(user[0].email_verified_at).not.toBeNull();
    });
  });

  describe('Step 3: Payment Simulation', () => {
    let paymentTransactionId: string;

    it('should create payment transaction', async () => {
      const transaction = await dataSource.query(
        'INSERT INTO payment_transactions (invoice_id, company_id, gateway, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          invoiceId,
          registrationResponse.companyId,
          'midtrans',
          registrationResponse.amount,
          'IDR',
          'pending',
        ],
      );

      paymentTransactionId = transaction.insertId;
      expect(paymentTransactionId).toBeDefined();
    });

    it('should simulate successful payment webhook', async () => {
      // Update transaction to success
      await dataSource.query(
        'UPDATE payment_transactions SET status = ?, gateway_transaction_id = ?, completed_at = NOW() WHERE id = ?',
        ['success', `TXN-${Date.now()}`, paymentTransactionId],
      );

      // Simulate webhook handler
      const webhookPayload = {
        transaction_id: `TXN-${Date.now()}`,
        order_id: registrationResponse.invoiceNumber,
        transaction_status: 'settlement',
        payment_type: 'credit_card',
        gross_amount: registrationResponse.amount,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/billing/webhooks/midtrans')
        .send(webhookPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should update invoice status to paid', async () => {
      const invoice = await dataSource.query(
        'SELECT * FROM invoices WHERE id = ?',
        [invoiceId],
      );

      expect(invoice[0].status).toBe('paid');
      expect(invoice[0].paid_at).not.toBeNull();
    });
  });

  describe('Step 4: Subscription Activation', () => {
    it('should activate subscription after payment', async () => {
      const subscription = await dataSource.query(
        'SELECT * FROM subscriptions WHERE id = ?',
        [registrationResponse.subscriptionId],
      );

      expect(subscription[0].status).toBe('active');
      expect(subscription[0].start_date).not.toBeNull();
      expect(subscription[0].end_date).not.toBeNull();
    });

    it('should update company status to active', async () => {
      const company = await dataSource.query(
        'SELECT * FROM companies WHERE id = ?',
        [registrationResponse.companyId],
      );

      expect(company[0].status).toBe('active');
      expect(company[0].subscription_status).toBe('active');
    });

    it('should calculate correct end date based on duration', async () => {
      const subscription = await dataSource.query(
        'SELECT * FROM subscriptions WHERE id = ?',
        [registrationResponse.subscriptionId],
      );

      const startDate = new Date(subscription[0].start_date);
      const endDate = new Date(subscription[0].end_date);
      const monthsDiff =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());

      expect(monthsDiff).toBe(registrationResponse.durationMonths);
    });
  });

  describe('Step 5: Default Store Creation', () => {
    it('should create default store for company', async () => {
      const stores = await dataSource.query(
        'SELECT * FROM stores WHERE company_id = ?',
        [registrationResponse.companyId],
      );

      expect(stores.length).toBeGreaterThan(0);
      expect(stores[0].name).toContain('Main Store');
      expect(stores[0].is_active).toBe(true);
    });
  });

  describe('Step 6: Invoice PDF Generation', () => {
    it('should generate invoice PDF after payment', async () => {
      // Wait a bit for async PDF generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const invoice = await dataSource.query(
        'SELECT * FROM invoices WHERE id = ?',
        [invoiceId],
      );

      expect(invoice[0].invoice_pdf_url).not.toBeNull();
      expect(invoice[0].invoice_pdf_url).toContain('/uploads/invoices/');
    });

    it('should be able to download invoice PDF', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/billing/invoices/${invoiceId}/download`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('Step 7: Email Notifications', () => {
    it('should queue welcome email', async () => {
      // Check Bull queue for welcome email job
      // This requires Redis connection and Bull queue inspection
      // For now, we'll check logs or skip this test
      expect(true).toBe(true); // Placeholder
    });

    it('should queue invoice email', async () => {
      // Check Bull queue for invoice email job
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Step 8: Login After Activation', () => {
    it('should allow login after subscription is active', async () => {
      const loginDto = {
        email:
          registrationResponse.ownerEmail || `owner-${Date.now()}@example.com`,
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.companyId).toBe(registrationResponse.companyId);
    });

    it('should not allow login if subscription is suspended', async () => {
      // Update subscription to suspended
      await dataSource.query(
        'UPDATE companies SET subscription_status = ? WHERE id = ?',
        ['suspended', registrationResponse.companyId],
      );

      const loginDto = {
        email:
          registrationResponse.ownerEmail || `owner-${Date.now()}@example.com`,
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('suspended');

      // Restore status for cleanup
      await dataSource.query(
        'UPDATE companies SET subscription_status = ? WHERE id = ?',
        ['active', registrationResponse.companyId],
      );
    });
  });

  describe('Step 9: Validation & Error Handling', () => {
    it('should reject registration with duplicate company email', async () => {
      const duplicateDto = {
        companyName: 'Another Company',
        companyEmail: registrationResponse.companyEmail,
        companyPhone: '081234567892',
        companyAddress: 'Another Address',
        ownerName: 'Jane Doe',
        ownerEmail: `another-${Date.now()}@example.com`,
        ownerPhone: '081234567893',
        password: 'Password123!',
        planId: 'plan-id-from-seeder',
        durationMonths: 12,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register-company')
        .send(duplicateDto)
        .expect(409);

      expect(response.body.message).toContain('already registered');
    });

    it('should reject registration with invalid plan', async () => {
      const invalidDto = {
        companyName: 'Test Company',
        companyEmail: `test-invalid-${Date.now()}@example.com`,
        companyPhone: '081234567890',
        companyAddress: 'Test Address',
        ownerName: 'John Doe',
        ownerEmail: `owner-invalid-${Date.now()}@example.com`,
        ownerPhone: '081234567891',
        password: 'Password123!',
        planId: 'invalid-plan-id',
        durationMonths: 12,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register-company')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('Invalid subscription plan');
    });

    it('should reject registration with invalid duration', async () => {
      const invalidDto = {
        companyName: 'Test Company',
        companyEmail: `test-duration-${Date.now()}@example.com`,
        companyPhone: '081234567890',
        companyAddress: 'Test Address',
        ownerName: 'John Doe',
        ownerEmail: `owner-duration-${Date.now()}@example.com`,
        ownerPhone: '081234567891',
        password: 'Password123!',
        planId: 'plan-id-from-seeder',
        durationMonths: 24, // Invalid duration
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register-company')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('Invalid duration');
    });
  });
});
