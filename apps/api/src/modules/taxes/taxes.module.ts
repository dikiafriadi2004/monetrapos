import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';
import { Tax } from './tax.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tax])],
  controllers: [TaxesController],
  providers: [TaxesService],
  exports: [TaxesService],
})
export class TaxesModule {}
