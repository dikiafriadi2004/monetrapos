import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from '../../../common/enums';
export declare const ROLES_KEY = "roles";
export declare const RequireRoles: (...roles: UserType[]) => (target: any, key?: string, descriptor?: any) => any;
export declare class RolesGuard implements CanActivate {
    private reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
