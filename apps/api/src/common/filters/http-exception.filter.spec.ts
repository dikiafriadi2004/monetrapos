import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from './http-exception.filter';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AllExceptionsFilter],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);

    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock request object
    mockRequest = {
      method: 'GET',
      url: '/api/v1/test',
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HTTP Exceptions', () => {
    it('should handle BadRequestException', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Invalid input',
          path: '/api/v1/test',
          method: 'GET',
        }),
      );
    });

    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'Resource not found',
        }),
      );
    });

    it('should handle UnauthorizedException', () => {
      const exception = new UnauthorizedException('Invalid credentials');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.UNAUTHORIZED,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          error: 'Unauthorized',
          message: 'Invalid credentials',
        }),
      );
    });

    it('should handle ForbiddenException', () => {
      const exception = new ForbiddenException('Access denied');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          error: 'Forbidden',
          message: 'Access denied',
        }),
      );
    });

    it('should handle ConflictException', () => {
      const exception = new ConflictException('Resource already exists');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'Resource already exists',
        }),
      );
    });

    it('should handle validation errors with array of messages', () => {
      const exception = new BadRequestException({
        message: ['field1 is required', 'field2 must be a number'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['field1 is required', 'field2 must be a number'],
          details: ['field1 is required', 'field2 must be a number'],
        }),
      );
    });
  });

  describe('Database Errors', () => {
    it('should handle duplicate entry error (MySQL)', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO users',
        [],
        new Error(
          "Duplicate entry 'test@example.com' for key 'users.email'",
        ),
      );
      (dbError as any).code = 'ER_DUP_ENTRY';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          error: 'Duplicate Entry',
          message: expect.stringContaining('already exists'),
        }),
      );
    });

    it('should handle duplicate entry error (PostgreSQL)', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO users',
        [],
        new Error('duplicate key value violates unique constraint'),
      );
      (dbError as any).code = '23505';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          error: 'Duplicate Entry',
        }),
      );
    });

    it('should handle foreign key constraint error', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO orders',
        [],
        new Error('foreign key constraint fails'),
      );
      (dbError as any).code = 'ER_NO_REFERENCED_ROW_2';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Foreign Key Constraint',
          message: 'Referenced record does not exist',
        }),
      );
    });

    it('should handle delete constraint error', () => {
      const dbError = new QueryFailedError(
        'DELETE FROM users',
        [],
        new Error('Cannot delete or update a parent row'),
      );
      (dbError as any).code = 'ER_ROW_IS_REFERENCED_2';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          error: 'Foreign Key Constraint',
          message: expect.stringContaining('referenced by other records'),
        }),
      );
    });

    it('should handle generic database errors without exposing details', () => {
      const dbError = new QueryFailedError(
        'SELECT * FROM users',
        [],
        new Error('Some internal database error'),
      );
      (dbError as any).code = 'UNKNOWN_ERROR';

      filter.catch(dbError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Database Error',
          message: 'A database error occurred',
        }),
      );
    });
  });

  describe('Generic Errors', () => {
    it('should handle generic JavaScript Error', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Error',
          message: 'Something went wrong',
        }),
      );
    });

    it('should handle unknown error types', () => {
      const exception = { weird: 'object' };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        }),
      );
    });
  });

  describe('Response Format', () => {
    it('should always include required fields in response', () => {
      const exception = new NotFoundException('Test');

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall).toHaveProperty('statusCode');
      expect(responseCall).toHaveProperty('timestamp');
      expect(responseCall).toHaveProperty('path');
      expect(responseCall).toHaveProperty('method');
      expect(responseCall).toHaveProperty('error');
      expect(responseCall).toHaveProperty('message');
    });

    it('should include timestamp in ISO format', () => {
      const exception = new NotFoundException('Test');

      filter.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });
});
