import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract company_id from JWT token (already decoded by JwtAuthGuard)
    const user = (req as any).user;

    if (user && user.companyId) {
      // Attach company context to request
      (req as any).companyId = user.companyId;
      (req as any).tenantId = user.companyId; // Alias for clarity
    }

    next();
  }
}
