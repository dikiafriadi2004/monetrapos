import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { AdminCompaniesController } from './admin-companies.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { Company } from './company.entity';
import { User } from '../users/user.entity';
import { Invoice } from '../billing/invoice.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User, Invoice, Subscription]),
    AdminAuthModule,
  ],
  controllers: [CompaniesController, AdminCompaniesController, AdminDashboardController, AdminSettingsController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
