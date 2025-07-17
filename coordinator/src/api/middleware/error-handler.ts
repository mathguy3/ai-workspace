import { Request, Response, NextFunction } from 'express';
import { APIError } from '../types';

// Custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error handler middleware
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Determine error type and create appropriate response
  let apiError: APIError;

  switch (error.name) {
    case 'ValidationError':
      apiError = {
        error: 'Validation Error',
        message: error.message,
        statusCode: 400,
        details: {
          field: (error as ValidationError).field,
          code: (error as ValidationError).code,
        },
      };
      break;

    case 'NotFoundError':
      apiError = {
        error: 'Not Found',
        message: error.message,
        statusCode: 404,
      };
      break;

    case 'UnauthorizedError':
      apiError = {
        error: 'Unauthorized',
        message: error.message,
        statusCode: 401,
      };
      break;

    case 'ForbiddenError':
      apiError = {
        error: 'Forbidden',
        message: error.message,
        statusCode: 403,
      };
      break;

    case 'RateLimitError':
      apiError = {
        error: 'Too Many Requests',
        message: error.message,
        statusCode: 429,
      };
      break;

    case 'SyntaxError':
      apiError = {
        error: 'Bad Request',
        message: 'Invalid JSON in request body',
        statusCode: 400,
      };
      break;

    default:
      // Default to 500 Internal Server Error
      apiError = {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name,
        } : undefined,
      };
      break;
  }

  // Send error response
  res.status(apiError.statusCode).json(apiError);
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Not found handler
export function notFoundHandler(req: Request, res: Response): void {
  const apiError: APIError = {
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
  };
  
  res.status(404).json(apiError);
}

// Request timeout handler
export function timeoutHandler(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const apiError: APIError = {
          error: 'Request Timeout',
          message: 'Request timed out',
          statusCode: 408,
        };
        res.status(408).json(apiError);
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

// Error logging utility
export function logError(error: Error, context?: Record<string, unknown>): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  };

  console.error('Error Log:', JSON.stringify(errorLog, null, 2));
}

// Health check error handler
export function healthCheckErrorHandler(error: Error): { status: string; error: string } {
  return {
    status: 'error',
    error: error.message,
  };
} 