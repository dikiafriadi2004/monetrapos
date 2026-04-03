import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'POST',
          url: '/api/v1/auth/login',
          body: { email: 'test@example.com', password: 'secret123' },
          headers: { 'user-agent': 'test-agent' },
          ip: '127.0.0.1',
          user: { id: 'user-123', companyId: 'company-456' },
        }),
      }),
    } as any;

    // Mock CallHandler
    mockCallHandler = {
      handle: jest.fn(),
    } as any;

    // Spy on logger methods
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Request Logging', () => {
    it('should log incoming requests with metadata', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(Logger.prototype.log).toHaveBeenCalledWith(
            expect.stringContaining('→ [POST] /api/v1/auth/login'),
          );
          expect(Logger.prototype.log).toHaveBeenCalledWith(
            expect.stringContaining('User: user-123'),
          );
          expect(Logger.prototype.log).toHaveBeenCalledWith(
            expect.stringContaining('Company: company-456'),
          );
          done();
        },
      });
    });

    it('should log request body when present', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(Logger.prototype.debug).toHaveBeenCalledWith(
            expect.stringContaining('Body:'),
          );
          done();
        },
      });
    });

    it('should handle anonymous users', (done) => {
      const contextWithoutUser = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'GET',
            url: '/api/v1/products',
            body: {},
            headers: {},
            ip: '127.0.0.1',
          }),
        }),
      } as any;

      mockCallHandler.handle = jest.fn().mockReturnValue(of([]));

      interceptor.intercept(contextWithoutUser, mockCallHandler).subscribe({
        complete: () => {
          expect(Logger.prototype.log).toHaveBeenCalledWith(
            expect.stringContaining('User: anonymous'),
          );
          done();
        },
      });
    });
  });

  describe('Response Logging', () => {
    it('should log successful responses with timing', (done) => {
      const responseData = { id: '123', name: 'Test Product' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(Logger.prototype.log).toHaveBeenCalledWith(
            expect.stringMatching(/← \[POST\].*\d+ms/),
          );
          done();
        },
      });
    });

    it('should truncate long responses', (done) => {
      const longResponse = { data: 'x'.repeat(500) };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(longResponse));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(Logger.prototype.debug).toHaveBeenCalledWith(
            expect.stringContaining('...'),
          );
          done();
        },
      });
    });
  });

  describe('Error Logging', () => {
    it('should log errors with timing', (done) => {
      const error = new Error('Test error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(Logger.prototype.error).toHaveBeenCalledWith(
            expect.stringMatching(/✗ \[POST\].*\d+ms.*Test error/),
          );
          done();
        },
      });
    });

    it('should log stack trace in development mode', (done) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:10:5';
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(Logger.prototype.debug).toHaveBeenCalledWith(
            expect.stringContaining('Stack:'),
          );
          process.env.NODE_ENV = originalEnv;
          done();
        },
      });
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should redact password fields', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const debugCalls = (Logger.prototype.debug as jest.Mock).mock.calls;
          const bodyLog = debugCalls.find((call) =>
            call[0].includes('Body:'),
          );
          expect(bodyLog[0]).toContain('***REDACTED***');
          expect(bodyLog[0]).not.toContain('secret123');
          done();
        },
      });
    });

    it('should redact token fields', (done) => {
      const contextWithToken = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'POST',
            url: '/api/v1/auth/refresh',
            body: { refreshToken: 'jwt-token-here' },
            headers: {},
            ip: '127.0.0.1',
          }),
        }),
      } as any;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      interceptor.intercept(contextWithToken, mockCallHandler).subscribe({
        complete: () => {
          const debugCalls = (Logger.prototype.debug as jest.Mock).mock.calls;
          const bodyLog = debugCalls.find((call) =>
            call[0].includes('Body:'),
          );
          expect(bodyLog[0]).toContain('***REDACTED***');
          expect(bodyLog[0]).not.toContain('jwt-token-here');
          done();
        },
      });
    });

    it('should redact credit card information', (done) => {
      const contextWithCard = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'POST',
            url: '/api/v1/payments',
            body: {
              cardNumber: '4111111111111111',
              cvv: '123',
              amount: 100000,
            },
            headers: {},
            ip: '127.0.0.1',
          }),
        }),
      } as any;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      interceptor.intercept(contextWithCard, mockCallHandler).subscribe({
        complete: () => {
          const debugCalls = (Logger.prototype.debug as jest.Mock).mock.calls;
          const bodyLog = debugCalls.find((call) =>
            call[0].includes('Body:'),
          );
          expect(bodyLog[0]).toContain('***REDACTED***');
          expect(bodyLog[0]).not.toContain('4111111111111111');
          expect(bodyLog[0]).not.toContain('123');
          expect(bodyLog[0]).toContain('100000'); // Amount should not be redacted
          done();
        },
      });
    });

    it('should redact nested sensitive fields', (done) => {
      const contextWithNested = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'POST',
            url: '/api/v1/users',
            body: {
              user: {
                email: 'test@example.com',
                password: 'secret123',
                profile: {
                  name: 'John Doe',
                  apiKey: 'api-key-secret',
                },
              },
            },
            headers: {},
            ip: '127.0.0.1',
          }),
        }),
      } as any;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      interceptor.intercept(contextWithNested, mockCallHandler).subscribe({
        complete: () => {
          const debugCalls = (Logger.prototype.debug as jest.Mock).mock.calls;
          const bodyLog = debugCalls.find((call) =>
            call[0].includes('Body:'),
          );
          expect(bodyLog[0]).toContain('***REDACTED***');
          expect(bodyLog[0]).not.toContain('secret123');
          expect(bodyLog[0]).not.toContain('api-key-secret');
          expect(bodyLog[0]).toContain('test@example.com'); // Email should not be redacted
          expect(bodyLog[0]).toContain('John Doe'); // Name should not be redacted
          done();
        },
      });
    });

    it('should handle arrays with sensitive data', (done) => {
      const contextWithArray = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'POST',
            url: '/api/v1/bulk-users',
            body: {
              users: [
                { email: 'user1@example.com', password: 'pass1' },
                { email: 'user2@example.com', password: 'pass2' },
              ],
            },
            headers: {},
            ip: '127.0.0.1',
          }),
        }),
      } as any;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      interceptor.intercept(contextWithArray, mockCallHandler).subscribe({
        complete: () => {
          const debugCalls = (Logger.prototype.debug as jest.Mock).mock.calls;
          const bodyLog = debugCalls.find((call) =>
            call[0].includes('Body:'),
          );
          expect(bodyLog[0]).toContain('***REDACTED***');
          expect(bodyLog[0]).not.toContain('pass1');
          expect(bodyLog[0]).not.toContain('pass2');
          done();
        },
      });
    });

    it('should sanitize response data', (done) => {
      const responseWithSensitive = {
        user: {
          id: '123',
          email: 'test@example.com',
          accessToken: 'jwt-token-here',
        },
      };
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(of(responseWithSensitive));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const debugCalls = (Logger.prototype.debug as jest.Mock).mock.calls;
          const responseLog = debugCalls.find((call) =>
            call[0].includes('Response:'),
          );
          expect(responseLog[0]).toContain('***REDACTED***');
          expect(responseLog[0]).not.toContain('jwt-token-here');
          done();
        },
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate and log response time', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: true }));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(Logger.prototype.log).toHaveBeenCalledWith(
            expect.stringMatching(/\d+ms/),
          );
          done();
        },
      });
    });
  });
});
