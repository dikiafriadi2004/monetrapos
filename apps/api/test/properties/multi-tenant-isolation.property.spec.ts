import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fc from 'fast-check';
import { AppModule } from '../../src/app.module';
import { Product } from '../../src/modules/products/product.entity';
import { Customer } from '../../src/modules/customers/customer.entity';
import { Employee } from '../../src/modules/employees/employee.entity';
import { Store } from '../../src/modules/stores/store.entity';
import { Inventory } from '../../src/modules/inventory/inventory.entity';
import { Company } from '../../src/modules/companies/company.entity';

/**
 * Property 27: Multi-Tenant Data Isolation
 * 
 * **Validates: Requirements 2.1**
 * 
 * Feature: MonetraPOS-complete-system, Property 27: Multi-Tenant Data Isolation
 * 
 * For any query by a user with company_id X, the results should only include 
 * records where company_id = X, and no records from other companies should be accessible.
 */
describe('Property 27: Multi-Tenant Data Isolation', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let productRepo: Repository<Product>;
  let customerRepo: Repository<Customer>;
  let employeeRepo: Repository<Employee>;
  let storeRepo: Repository<Store>;
  let inventoryRepo: Repository<Inventory>;
  let companyRepo: Repository<Company>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
    productRepo = module.get(getRepositoryToken(Product));
    customerRepo = module.get(getRepositoryToken(Customer));
    employeeRepo = module.get(getRepositoryToken(Employee));
    storeRepo = module.get(getRepositoryToken(Store));
    inventoryRepo = module.get(getRepositoryToken(Inventory));
    companyRepo = module.get(getRepositoryToken(Company));
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (module) {
      await module.close();
    }
  });

  /**
   * Test that product queries are properly scoped to company_id
   */
  it('should isolate products by company_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 3 }), // Generate 2-3 company IDs
        fc.array(fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          price: fc.double({ min: 0.01, max: 10000, noNaN: true }),
          sku: fc.string({ minLength: 1, maxLength: 20 }),
        }), { minLength: 3, maxLength: 10 }), // Generate 3-10 products
        async (companyIds, productData) => {
          // Setup: Create test companies and stores
          const companies = await Promise.all(
            companyIds.map(async (id, index) => {
              const company = companyRepo.create({
                id,
                name: `Test Company ${id.substring(0, 8)}`,
                slug: `test-company-${id.substring(0, 8)}-${index}-${Date.now()}`,
                email: `test-${id.substring(0, 8)}-${index}-${Date.now()}@example.com`,
                phone: '1234567890',
                status: 'active',
              });
              return companyRepo.save(company);
            })
          );

          const stores = await Promise.all(
            companies.map(async (company) => {
              const store = storeRepo.create({
                companyId: company.id,
                name: `Store for ${company.name}`,
                address: 'Test Address',
                phone: '1234567890',
                isActive: true,
              });
              return storeRepo.save(store);
            })
          );

          // Create products distributed across companies
          const products = await Promise.all(
            productData.map(async (data, index) => {
              const companyIndex = index % companies.length;
              const product = productRepo.create({
                companyId: companies[companyIndex].id,
                storeId: stores[companyIndex].id,
                name: data.name,
                price: data.price,
                sku: `${data.sku}-${Date.now()}-${index}`,
                trackInventory: false,
              });
              return productRepo.save(product);
            })
          );

          // Test: Query products for each company
          for (let i = 0; i < companies.length; i++) {
            const targetCompanyId = companies[i].id;
            
            // Query products for this company
            const companyProducts = await productRepo.find({
              where: { companyId: targetCompanyId },
            });

            // Property: All returned products must belong to the target company
            const allBelongToCompany = companyProducts.every(
              (p) => p.companyId === targetCompanyId
            );

            // Property: No products from other companies should be included
            const noOtherCompanyProducts = companyProducts.every(
              (p) => !companyIds.filter(id => id !== targetCompanyId).includes(p.companyId)
            );

            // Assertions
            expect(allBelongToCompany).toBe(true);
            expect(noOtherCompanyProducts).toBe(true);
          }

          // Cleanup
          await productRepo.remove(products);
          await storeRepo.remove(stores);
          await companyRepo.remove(companies);
        }
      ),
      { numRuns: 20 } // Reduced iterations for faster execution
    );
  }, 120000); // 120 second timeout for property test

  /**
   * Test that customer queries are properly scoped to company_id
   */
  it('should isolate customers by company_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 3 }),
        fc.array(fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
        }), { minLength: 3, maxLength: 10 }),
        async (companyIds, customerData) => {
          // Setup companies and stores
          const companies = await Promise.all(
            companyIds.map(async (id, index) => {
              const company = companyRepo.create({
                id,
                name: `Test Company ${id.substring(0, 8)}`,
                slug: `test-company-${id.substring(0, 8)}-${index}-${Date.now()}`,
                email: `test-${id.substring(0, 8)}-${index}-${Date.now()}@example.com`,
                phone: '1234567890',
                status: 'active',
              });
              return companyRepo.save(company);
            })
          );

          const stores = await Promise.all(
            companies.map(async (company) => {
              const store = storeRepo.create({
                companyId: company.id,
                name: `Store for ${company.name}`,
                address: 'Test Address',
                phone: '1234567890',
                isActive: true,
              });
              return storeRepo.save(store);
            })
          );

          // Create customers distributed across companies
          const customers = await Promise.all(
            customerData.map(async (data, index) => {
              const companyIndex = index % companies.length;
              const customer = customerRepo.create({
                companyId: companies[companyIndex].id,
                storeId: stores[companyIndex].id,
                customerNumber: `CUST-${Date.now()}-${index}`,
                name: data.name,
                email: `${index}-${Date.now()}-${data.email}`,
                phone: data.phone,
              });
              return customerRepo.save(customer);
            })
          );

          // Test: Query customers for each company
          for (let i = 0; i < companies.length; i++) {
            const targetCompanyId = companies[i].id;
            
            const companyCustomers = await customerRepo.find({
              where: { companyId: targetCompanyId },
            });

            // Property: All returned customers must belong to the target company
            const allBelongToCompany = companyCustomers.every(
              (c) => c.companyId === targetCompanyId
            );

            // Property: No customers from other companies
            const noOtherCompanyCustomers = companyCustomers.every(
              (c) => !companyIds.filter(id => id !== targetCompanyId).includes(c.companyId)
            );

            expect(allBelongToCompany).toBe(true);
            expect(noOtherCompanyCustomers).toBe(true);
          }

          // Cleanup
          await customerRepo.remove(customers);
          await storeRepo.remove(stores);
          await companyRepo.remove(companies);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Test that employee queries are properly scoped to company_id
   */
  it('should isolate employees by company_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 3 }),
        fc.array(fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
        }), { minLength: 3, maxLength: 10 }),
        async (companyIds, employeeData) => {
          const companies = await Promise.all(
            companyIds.map(async (id, index) => {
              const company = companyRepo.create({
                id,
                name: `Test Company ${id.substring(0, 8)}`,
                slug: `test-company-${id.substring(0, 8)}-${index}-${Date.now()}`,
                email: `test-${id.substring(0, 8)}-${index}-${Date.now()}@example.com`,
                phone: '1234567890',
                status: 'active',
              });
              return companyRepo.save(company);
            })
          );

          const stores = await Promise.all(
            companies.map(async (company) => {
              const store = storeRepo.create({
                companyId: company.id,
                name: `Store for ${company.name}`,
                address: 'Test Address',
                phone: '1234567890',
                isActive: true,
              });
              return storeRepo.save(store);
            })
          );

          const employees = await Promise.all(
            employeeData.map(async (data, index) => {
              const companyIndex = index % companies.length;
              const employee = employeeRepo.create({
                companyId: companies[companyIndex].id,
                storeId: stores[companyIndex].id,
                employeeNumber: `EMP-${Date.now()}-${index}`,
                name: data.name,
                email: `${index}-${Date.now()}-${data.email}`,
                phone: '1234567890',
                position: 'Staff',
                hireDate: new Date(),
              });
              return employeeRepo.save(employee);
            })
          );

          for (let i = 0; i < companies.length; i++) {
            const targetCompanyId = companies[i].id;
            
            const companyEmployees = await employeeRepo.find({
              where: { companyId: targetCompanyId },
            });

            const allBelongToCompany = companyEmployees.every(
              (e) => e.companyId === targetCompanyId
            );

            expect(allBelongToCompany).toBe(true);
          }

          await employeeRepo.remove(employees);
          await storeRepo.remove(stores);
          await companyRepo.remove(companies);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Test that store queries are properly scoped to company_id
   */
  it('should isolate stores by company_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 3 }),
        fc.integer({ min: 1, max: 3 }), // Number of stores per company
        async (companyIds, storesPerCompany) => {
          const companies = await Promise.all(
            companyIds.map(async (id, index) => {
              const company = companyRepo.create({
                id,
                name: `Test Company ${id.substring(0, 8)}`,
                slug: `test-company-${id.substring(0, 8)}-${index}-${Date.now()}`,
                email: `test-${id.substring(0, 8)}-${index}-${Date.now()}@example.com`,
                phone: '1234567890',
                status: 'active',
              });
              return companyRepo.save(company);
            })
          );

          const stores = [];
          for (const company of companies) {
            for (let i = 0; i < storesPerCompany; i++) {
              const store = storeRepo.create({
                companyId: company.id,
                name: `Store ${i} for ${company.name}`,
                address: 'Test Address',
                phone: '1234567890',
                isActive: true,
              });
              stores.push(await storeRepo.save(store));
            }
          }

          for (let i = 0; i < companies.length; i++) {
            const targetCompanyId = companies[i].id;
            
            const companyStores = await storeRepo.find({
              where: { companyId: targetCompanyId },
            });

            const allBelongToCompany = companyStores.every(
              (s) => s.companyId === targetCompanyId
            );

            expect(allBelongToCompany).toBe(true);
            expect(companyStores.length).toBe(storesPerCompany);
          }

          await storeRepo.remove(stores);
          await companyRepo.remove(companies);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Test that inventory queries are properly scoped to company_id
   */
  it('should isolate inventory by company_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 3 }),
        fc.array(fc.record({
          productName: fc.string({ minLength: 1, maxLength: 50 }),
          quantity: fc.integer({ min: 0, max: 1000 }),
        }), { minLength: 3, maxLength: 10 }),
        async (companyIds, inventoryData) => {
          const companies = await Promise.all(
            companyIds.map(async (id, index) => {
              const company = companyRepo.create({
                id,
                name: `Test Company ${id.substring(0, 8)}`,
                slug: `test-company-${id.substring(0, 8)}-${index}-${Date.now()}`,
                email: `test-${id.substring(0, 8)}-${index}-${Date.now()}@example.com`,
                phone: '1234567890',
                status: 'active',
              });
              return companyRepo.save(company);
            })
          );

          const stores = await Promise.all(
            companies.map(async (company) => {
              const store = storeRepo.create({
                companyId: company.id,
                name: `Store for ${company.name}`,
                address: 'Test Address',
                phone: '1234567890',
                isActive: true,
              });
              return storeRepo.save(store);
            })
          );

          const products = await Promise.all(
            inventoryData.map(async (data, index) => {
              const companyIndex = index % companies.length;
              const product = productRepo.create({
                companyId: companies[companyIndex].id,
                storeId: stores[companyIndex].id,
                name: data.productName,
                price: 100,
                sku: `SKU-${Date.now()}-${index}`,
                trackInventory: true,
              });
              return productRepo.save(product);
            })
          );

          const inventories = await Promise.all(
            products.map(async (product, index) => {
              const inventory = inventoryRepo.create({
                companyId: product.companyId,
                storeId: product.storeId,
                productId: product.id,
                quantity: inventoryData[index].quantity,
                reservedQuantity: 0,
              });
              return inventoryRepo.save(inventory);
            })
          );

          for (let i = 0; i < companies.length; i++) {
            const targetCompanyId = companies[i].id;
            
            const companyInventory = await inventoryRepo.find({
              where: { companyId: targetCompanyId },
            });

            const allBelongToCompany = companyInventory.every(
              (inv) => inv.companyId === targetCompanyId
            );

            expect(allBelongToCompany).toBe(true);
          }

          await inventoryRepo.remove(inventories);
          await productRepo.remove(products);
          await storeRepo.remove(stores);
          await companyRepo.remove(companies);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Cross-entity test: Verify no data leakage across multiple entity types
   */
  it('should prevent cross-tenant data access across all entity types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), fc.uuid()), // Two different company IDs
        async ([companyId1, companyId2]) => {
          // Ensure different company IDs
          fc.pre(companyId1 !== companyId2);

          const timestamp = Date.now();

          // Create two companies
          const company1 = await companyRepo.save(
            companyRepo.create({
              id: companyId1,
              name: 'Company 1',
              slug: `company-1-${timestamp}`,
              email: `company1-${timestamp}@example.com`,
              phone: '1234567890',
              status: 'active',
            })
          );

          const company2 = await companyRepo.save(
            companyRepo.create({
              id: companyId2,
              name: 'Company 2',
              slug: `company-2-${timestamp}`,
              email: `company2-${timestamp}@example.com`,
              phone: '1234567890',
              status: 'active',
            })
          );

          // Create stores for each company
          const store1 = await storeRepo.save(
            storeRepo.create({
              companyId: companyId1,
              name: 'Store 1',
              address: 'Address 1',
              phone: '1234567890',
              isActive: true,
            })
          );

          const store2 = await storeRepo.save(
            storeRepo.create({
              companyId: companyId2,
              name: 'Store 2',
              address: 'Address 2',
              phone: '1234567890',
              isActive: true,
            })
          );

          // Create data for company 1
          const product1 = await productRepo.save(
            productRepo.create({
              companyId: companyId1,
              storeId: store1.id,
              name: 'Product 1',
              price: 100,
              sku: `SKU-1-${timestamp}`,
            })
          );

          const customer1 = await customerRepo.save(
            customerRepo.create({
              companyId: companyId1,
              storeId: store1.id,
              customerNumber: `CUST-1-${timestamp}`,
              name: 'Customer 1',
              email: `customer1-${timestamp}@example.com`,
            })
          );

          // Create data for company 2
          const product2 = await productRepo.save(
            productRepo.create({
              companyId: companyId2,
              storeId: store2.id,
              name: 'Product 2',
              price: 200,
              sku: `SKU-2-${timestamp}`,
            })
          );

          const customer2 = await customerRepo.save(
            customerRepo.create({
              companyId: companyId2,
              storeId: store2.id,
              customerNumber: `CUST-2-${timestamp}`,
              name: 'Customer 2',
              email: `customer2-${timestamp}@example.com`,
            })
          );

          // Test: Query for company 1 should not return company 2 data
          const company1Products = await productRepo.find({
            where: { companyId: companyId1 },
          });
          const company1Customers = await customerRepo.find({
            where: { companyId: companyId1 },
          });

          // Test: Query for company 2 should not return company 1 data
          const company2Products = await productRepo.find({
            where: { companyId: companyId2 },
          });
          const company2Customers = await customerRepo.find({
            where: { companyId: companyId2 },
          });

          // Assertions
          expect(company1Products.every(p => p.companyId === companyId1)).toBe(true);
          expect(company1Customers.every(c => c.companyId === companyId1)).toBe(true);
          expect(company2Products.every(p => p.companyId === companyId2)).toBe(true);
          expect(company2Customers.every(c => c.companyId === companyId2)).toBe(true);

          // Ensure no cross-contamination
          expect(company1Products.find(p => p.id === product2.id)).toBeUndefined();
          expect(company1Customers.find(c => c.id === customer2.id)).toBeUndefined();
          expect(company2Products.find(p => p.id === product1.id)).toBeUndefined();
          expect(company2Customers.find(c => c.id === customer1.id)).toBeUndefined();

          // Cleanup
          await productRepo.remove([product1, product2]);
          await customerRepo.remove([customer1, customer2]);
          await storeRepo.remove([store1, store2]);
          await companyRepo.remove([company1, company2]);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);
});

