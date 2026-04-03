import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { Discount } from './discount.entity';
import { DiscountUsage } from './discount-usage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Discount, DiscountUsage])],
  controllers: [DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
