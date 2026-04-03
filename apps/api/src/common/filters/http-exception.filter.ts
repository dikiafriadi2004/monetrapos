import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * Global exception filter that handles all types of errors
 * and returns consistent error responses across the API.
 * 
 * Handles:
 * - HTTP exceptions (BadRequest, NotFound, Unauthorized, etc.)
 * - Database errors (TypeORM QueryFailedError)
 * - Validation errors (class-validator)
 * - Generic JavaScript errors
 * - Unknown errors
 * 
 * Requirements: 6.2 - Security & Error Handling
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    // Handle HTTP exceptions (NestJS built-in exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || error;
        
        // Include validation errors if present
        if (Array.isArray(responseObj.message)) {
          details = responseObj.message;
        }
      } else {
        message = exceptionResponse as string;
      }
    }
    // Handle TypeORM database errors
    else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Error';
      
      const dbError = exception as any;
      
      // Handle specific database error codes
      if (dbError.code === 'ER_DUP_ENTRY' || dbError.code === '23505') {
        status = HttpStatus.CONFLICT;
        error = 'Duplicate Entry';
        message = this.extractDuplicateFieldMessage(dbError.message);
      } else if (dbError.code === 'ER_NO_REFERENCED_ROW_2' || dbError.code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        error = 'Foreign Key Constraint';
        message = 'Referenced record does not exist';
      } else if (dbError.code === 'ER_ROW_IS_REFERENCED_2' || dbError.code === '23503') {
        status = HttpStatus.CONFLICT;
        error = 'Foreign Key Constraint';
        message = 'Cannot delete record because it is referenced by other records';
      } else {
        // Generic database error - don't expose internal details
        message = 'A database error occurred';
        
        // Log full error for debugging but don't expose to client
        this.logger.error(
          `Database error: ${dbError.message}`,
          dbError.stack,
        );
      }
    }
    // Handle generic JavaScript errors
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      
      // Don't expose stack traces in production
      if (process.env.NODE_ENV !== 'production') {
        details = exception.stack;
      }
    }
    // Handle unknown errors
    else {
      message = 'An unexpected error occurred';
      this.logger.error(
        `Unknown error type: ${JSON.stringify(exception)}`,
      );
    }

    // Log error with appropriate level
    const logMessage = `${request.method} ${request.url} - ${status} ${error}`;
    
    if (status >= 500) {
      // Server errors - log with stack trace
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else if (status >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `${logMessage}: ${typeof message === 'string' ? message : JSON.stringify(message)}`,
      );
    }

    // Build consistent error response
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    };

    // Include additional details if available (validation errors, etc.)
    if (details !== undefined) {
      errorResponse.details = details;
    }

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Extract a user-friendly message from duplicate entry error
   */
  private extractDuplicateFieldMessage(errorMessage: string): string {
    // Try to extract field name from error message
    const match = errorMessage.match(/for key '([^']+)'/);
    if (match && match[1]) {
      const fieldName = match[1].replace(/_/g, ' ');
      return `A record with this ${fieldName} already exists`;
    }
    return 'A record with this value already exists';
  }
}
