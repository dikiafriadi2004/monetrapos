import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController, AdminRolesController } from './roles.controller';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission]),
    AdminAuthModule,
  ],
  controllers: [RolesController, AdminRolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
