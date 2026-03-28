import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './product.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, ProductVariant])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
