import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Company } from '../../modules/companies/company.entity';
import { User, UserRole } from '../../modules/users/user.entity';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    // Check if any company exists
    const companyCount = await this.companyRepo.count();
    if (companyCount > 0) {
      this.logger.log(
        `Company and Admin already seeded (${companyCount} found)`,
      );
      return;
    }

    this.logger.log('Seeding initial Company and Admin user...');

    // 1. Create Company
    const company = this.companyRepo.create({
      name: 'Super Admin Company',
      slug: 'super-admin',
      email: 'admin@monetrapos.com',
      phone: '081234567890',
      status: 'active',
      subscriptionStatus: 'active',
    });
    await this.companyRepo.save(company);

    // 2. Create Admin User
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = this.userRepo.create({
      companyId: company.id,
      name: 'Super Admin',
      email: 'admin@monetrapos.com',
      passwordHash: hashedPassword,
      role: UserRole.OWNER,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    await this.userRepo.save(adminUser);

    this.logger.log('✅ Seeded initial Admin account:');
    this.logger.log('Email: admin@monetrapos.com');
    this.logger.log('Password: admin123');
  }
}
