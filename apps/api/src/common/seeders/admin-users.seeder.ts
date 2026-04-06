import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser, AdminRole } from '../../modules/admin-auth/admin-user.entity';

@Injectable()
export class AdminUsersSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminUsersSeeder.name);

  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepo: Repository<AdminUser>,
  ) {}

  async onModuleInit() {
    const count = await this.adminUserRepo.count();
    if (count > 0) {
      this.logger.log(`AdminUsers already seeded (${count} found) — skipping`);
      return;
    }

    this.logger.log('Seeding initial AdminUser...');

    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = this.adminUserRepo.create({
      name: 'Super Admin',
      email: 'admin@monetrapos.com',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    });
    await this.adminUserRepo.save(admin);

    this.logger.log('✅ Seeded initial AdminUser:');
    this.logger.log('Email: admin@monetrapos.com');
    this.logger.log('Password: admin123');
  }
}
