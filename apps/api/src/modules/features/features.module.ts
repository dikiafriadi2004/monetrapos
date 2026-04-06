import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';
import { Feature } from './feature.entity';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Feature]), AdminAuthModule],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
