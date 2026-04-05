import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingContent } from './landing-content.entity';
import { LandingService } from './landing.service';
import { LandingController } from './landing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LandingContent])],
  controllers: [LandingController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
