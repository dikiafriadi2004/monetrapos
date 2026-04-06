import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.entity';
import { AuditController, AdminAuditController } from './audit.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    AdminAuthModule,
  ],
  controllers: [AuditController, AdminAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
