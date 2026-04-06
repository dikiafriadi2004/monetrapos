import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from './payment-method.entity';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { QrisConfig } from '../payments/qris-config.entity';
import { QrisDynamicService } from '../payments/qris-dynamic.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethod, QrisConfig]),
    PaymentsModule,
  ],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService, QrisDynamicService],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
