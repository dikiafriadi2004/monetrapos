import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddOnsService } from './add-ons.service';
import { CompanyAddOnsService } from './company-add-ons.service';
import { AddOnsController, AdminAddOnsController } from './add-ons.controller';
import { AddOn } from './add-on.entity';
import { CompanyAddOn } from './company-add-on.entity';
import { Company } from '../companies/company.entity';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { BillingModule } from '../billing/billing.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AddOnsSeeder } from '../../common/seeders/add-ons.seeder';

@Module({
  imports: [
    TypeOrmModule.forFeature([AddOn, CompanyAddOn, Company]),
    PaymentGatewayModule,
    BillingModule,
    AdminAuthModule,
  ],
  controllers: [AddOnsController, AdminAddOnsController],
  providers: [AddOnsService, CompanyAddOnsService, AddOnsSeeder],
  exports: [AddOnsService, CompanyAddOnsService, AddOnsSeeder],
})
export class AddOnsModule {}
