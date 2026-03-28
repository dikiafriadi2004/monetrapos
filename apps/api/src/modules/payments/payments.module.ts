import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentMethod } from './payment-method.entity';
import { QrisConfig } from './qris-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod, QrisConfig])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
