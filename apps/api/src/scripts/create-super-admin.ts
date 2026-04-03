import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { UserRole, User } from '../modules/users/user.entity';
import { Company } from '../modules/companies/company.entity';
import { DataSource } from 'typeorm';
import * as readline from 'readline';

/**
 * Script to manually create Super Admin accounts
 * This is the ONLY way to create Company Admin accounts for security
 * 
 * Usage:
 * npm run create-admin
 */

async function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function createSuperAdmin() {
  console.log('\n=== MonetRAPOS - Create Super Admin ===\n');
  console.log('⚠️  SECURITY: This is the ONLY way to create Company Admin accounts\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    const companiesService = app.get(CompaniesService);
    const dataSource = app.get(DataSource);

    // Get Super Admin company using repository
    const companyRepo = dataSource.getRepository(Company);
    const superAdminCompany = await companyRepo.findOne({
      where: { slug: 'super-admin' },
    });
    if (!superAdminCompany) {
      console.error('❌ Error: Super Admin company not found!');
      console.error('Please run the backend first to create the initial company.');
      await app.close();
      process.exit(1);
    }

    // Prompt for admin details
    const name = await question('Admin Name: ');
    const email = await question('Admin Email: ');
    const password = await question('Admin Password (min 8 characters): ');

    // Validate input
    if (!name || name.trim().length < 2) {
      console.error('❌ Error: Name must be at least 2 characters!');
      await app.close();
      process.exit(1);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Error: Invalid email format!');
      await app.close();
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters!');
      await app.close();
      process.exit(1);
    }

    // Check if email already exists in Super Admin company
    const existingUser = await usersService.findByEmail(email, superAdminCompany.id);
    if (existingUser) {
      console.error('❌ Error: Email already exists!');
      await app.close();
      process.exit(1);
    }

    // Create admin user
    const admin = await usersService.create({
      companyId: superAdminCompany.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password, // UsersService will hash it
      role: UserRole.OWNER, // OWNER role = Super Admin
    });

    // Update user to set email verified
    const userRepo = dataSource.getRepository(User);
    await userRepo.update(admin.id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    console.log('\n✅ Super Admin created successfully!\n');
    console.log('Details:');
    console.log(`  Name: ${admin.name}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role: OWNER (Super Admin)`);
    console.log(`  Status: Active\n`);
    console.log('🔐 This admin can now login to Company Admin Portal');
    console.log(`   URL: ${process.env.COMPANY_ADMIN_URL || 'http://localhost:4402'}\n`);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating Super Admin:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();
