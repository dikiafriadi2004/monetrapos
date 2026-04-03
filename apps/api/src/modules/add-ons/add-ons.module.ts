import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddOnsService } from './add-ons.service';
import { CompanyAddOnsService } from './company-add-ons.service';
import { AddOnsController } from './add-ons.controller';
import { AddOn } from './add-on.entity';
import { CompanyAddOn } from './company-add-on.entity';
import { Company } from '../companies/company.entity';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AddOn, CompanyAddOn, Company]),
    PaymentGatewayModule,
    BillingModule,
  ],
  controllers: [AddOnsController],
  providers: [AddOnsService, CompanyAddOnsService],
  exports: [AddOnsService, CompanyAddOnsService],
})
export class AddOnsModule {}
