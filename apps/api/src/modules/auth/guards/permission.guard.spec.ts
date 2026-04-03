import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard, PERMISSIONS_KEY } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access when no permissions are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext({ type: 'employee' });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when permissions array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockExecutionContext({ type: 'employee' });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.view']);
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'User not authenticated',
      );
    });

    it('should allow company_admin to access any endpoint', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.create', 'product.delete']);
      const context = createMockExecutionContext({
        type: 'company_admin',
        permissions: [],
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow member (owner) to access any endpoint', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.create', 'product.delete']);
      const context = createMockExecutionContext({
        type: 'member',
        permissions: [],
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow employee with required permissions', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.view']);
      const context = createMockExecutionContext({
        type: 'employee',
        permissions: ['product.view', 'product.create'],
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow employee with all required permissions', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.view', 'product.create']);
      const context = createMockExecutionContext({
        type: 'employee',
        permissions: ['product.view', 'product.create', 'product.edit'],
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when employee has no permissions', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.view']);
      const context = createMockExecutionContext({
        type: 'employee',
        permissions: [],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions',
      );
    });

    it('should throw ForbiddenException when employee lacks required permission', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.delete']);
      const context = createMockExecutionContext({
        type: 'employee',
        permissions: ['product.view', 'product.create'],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions',
      );
    });

    it('should throw ForbiddenException when employee lacks one of multiple required permissions', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.view', 'product.delete']);
      const context = createMockExecutionContext({
        type: 'employee',
        permissions: ['product.view', 'product.create'],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions',
      );
    });

    it('should throw ForbiddenException when employee permissions is undefined', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['product.view']);
      const context = createMockExecutionContext({
        type: 'employee',
        permissions: undefined,
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions',
      );
    });
  });
});
