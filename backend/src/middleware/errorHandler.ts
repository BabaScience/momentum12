import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { IApiResponse } from '../types/index.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', errors?: Record<string, string[]>) {
    super(message, 400, true, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

const formatZodError = (error: ZodError): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });
  
  return errors;
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in development
  if (env.isDevelopment) {
    console.error('Error:', err);
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: IApiResponse = {
      success: false,
      message: 'Validation error',
      errors: formatZodError(err),
    };
    res.status(400).json(response);
    return;
  }
  
  // Handle AppError
  if (err instanceof AppError) {
    const response: IApiResponse = {
      success: false,
      message: err.message,
      errors: err.errors,
    };
    res.status(err.statusCode).json(response);
    return;
  }
  
  // Handle MongoDB duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const response: IApiResponse = {
      success: false,
      message: 'Duplicate entry found',
    };
    res.status(409).json(response);
    return;
  }
  
  // Handle MongoDB validation error
  if (err.name === 'ValidationError') {
    const response: IApiResponse = {
      success: false,
      message: 'Validation error',
      errors: { validation: [err.message] },
    };
    res.status(400).json(response);
    return;
  }
  
  // Handle MongoDB CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const response: IApiResponse = {
      success: false,
      message: 'Invalid ID format',
    };
    res.status(400).json(response);
    return;
  }
  
  // Default error response
  const response: IApiResponse = {
    success: false,
    message: env.isProduction ? 'Internal server error' : err.message,
  };
  res.status(500).json(response);
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  const response: IApiResponse = {
    success: false,
    message: 'Route not found',
  };
  res.status(404).json(response);
};

