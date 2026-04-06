import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { QrisDynamicService } from './qris-dynamic.service';
import { PaymentMethod } from './payment-method.entity';
import { QrisConfig } from './qris-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod, QrisConfig])],
  controllers: [PaymentsController],
  providers: [PaymentsService, QrisDynamicService],
  exports: [PaymentsService, QrisDynamicService],
})
export class PaymentsModule {}
