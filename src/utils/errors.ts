import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

// Base application error class
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code: string;
    public readonly details?: Record<string, any>;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true,
        code: string = 'INTERNAL_SERVER_ERROR',
        details?: Record<string, any>
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        this.details = details;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

// 404 - Not Found
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found', details?: Record<string, any>) {
        super(message, 404, true, 'NOT_FOUND', details);
    }
}

// 400 - Bad Request
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request', details?: Record<string, any>) {
        super(message, 400, true, 'BAD_REQUEST', details);
    }
}

// 403 - Forbidden
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access forbidden', details?: Record<string, any>) {
        super(message, 403, true, 'FORBIDDEN', details);
    }
}

// 409 - Conflict
export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict', details?: Record<string, any>) {
        super(message, 409, true, 'CONFLICT', details);
    }
}

// 422 - Validation Error
export class ValidationError extends AppError {
    public readonly errors: Record<string, string[]>;

    constructor(message: string = 'Validation failed', errors: Record<string, string[]> = {}) {
        super(message, 422, true, 'VALIDATION_ERROR', { errors });
        this.errors = errors;
    }
}

// 500 - Internal Server Error
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error', details?: Record<string, any>) {
        super(message, 500, false, 'INTERNAL_SERVER_ERROR', details);
    }
}

interface ExpressValidationError extends Error {
    errors: Record<string, string[]>;
}

interface MongoError extends Error {
    code: number;
    keyPattern: Record<string, any>;
}

/**
 * Express error handling middleware
 */
export const errorHandler: ErrorRequestHandler = (
    err: Error | ExpressValidationError | MongoError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Handle our custom AppError instances
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            code: err.code,
            message: err.message,
            ...(err.details && { details: err.details }),
            ...(err instanceof ValidationError && { errors: err.errors }),
            timestamp: new Date().toISOString(),
            path: req.path
        });
        return;
    }

    // Handle validation errors from express-validator
    if (err.name === 'ValidationError') {
        res.status(422).json({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            errors: (err as ExpressValidationError).errors,
            timestamp: new Date().toISOString(),
            path: req.path
        });
        return;
    }

    // Handle MongoDB duplicate key errors
    if ('code' in err && err.code === 11000) {
        const field = Object.keys((err as MongoError).keyPattern)[0];
        res.status(409).json({
            status: 'error',
            code: 'DUPLICATE_KEY',
            message: `Duplicate value for field: ${field}`,
            field,
            timestamp: new Date().toISOString(),
            path: req.path
        });
        return;
    }

    // Handle service-specific errors with better classification
    if (err.message?.includes('not found')) {
        res.status(404).json({
            status: 'error',
            code: 'NOT_FOUND',
            message: err.message,
            timestamp: new Date().toISOString(),
            path: req.path
        });
        return;
    }

    if (err.message?.includes('Invalid state transition')) {
        res.status(400).json({
            status: 'error',
            code: 'INVALID_STATE_TRANSITION',
            message: err.message,
            timestamp: new Date().toISOString(),
            path: req.path
        });
        return;
    }

    // Log unexpected errors
    console.error('Unexpected error:', err);

    // Return generic error for non-operational errors
    res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.path
    });
};