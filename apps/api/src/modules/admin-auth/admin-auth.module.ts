import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminUser } from './admin-user.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController, AdminSettingsUsersController } from './admin-auth.controller';
import { JwtAdminStrategy } from './strategies/jwt-admin.strategy';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminUsersSeeder } from '../../common/seeders/admin-users.seeder';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'fallback_secret',
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AdminAuthController, AdminSettingsUsersController],
  providers: [AdminAuthService, JwtAdminStrategy, AdminJwtGuard, AdminUsersSeeder],
  exports: [AdminAuthService, JwtModule, AdminJwtGuard, TypeOrmModule, AdminUsersSeeder],
})
export class AdminAuthModule {}
