import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser, AdminRole } from '../../modules/admin-auth/admin-user.entity';

@Injectable()
export class AdminUsersSeeder {
  private readonly logger = new Logger(AdminUsersSeeder.name);

  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepo: Repository<AdminUser>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.adminUserRepo.count();
    if (count > 0) {
      this.logger.log(`AdminUsers already seeded (${count} found) — skipping`);
      return;
    }

    this.logger.log('Seeding initial AdminUser...');

    const defaultEmail = process.env.ADMIN_EMAIL || 'admin@monetrapos.com';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const admin = this.adminUserRepo.create({
      name: 'Super Admin',
      email: defaultEmail,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    });
    await this.adminUserRepo.save(admin);

    this.logger.log(`✅ Seeded initial AdminUser: ${defaultEmail}`);
  }
}
