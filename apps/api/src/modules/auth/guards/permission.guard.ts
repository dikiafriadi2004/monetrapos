import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: string[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(
      PERMISSIONS_KEY,
      permissions,
      descriptor ? descriptor.value : target,
    );
    return descriptor ? descriptor : target;
  };
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Owner role always has full access to all features
    if (user.role === 'owner') {
      return true;
    }

    // Members with non-owner roles (admin, manager, accountant) need permission check
    // Employees also need permission check
    if (!user.permissions || user.permissions.length === 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
