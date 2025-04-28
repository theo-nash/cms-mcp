import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

// Base application error class
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

// 404 - Not Found
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
    }
}

// 400 - Bad Request
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request') {
        super(message, 400);
    }
}

// 403 - Forbidden
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access forbidden') {
        super(message, 403);
    }
}

// 409 - Conflict
export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict') {
        super(message, 409);
    }
}

// 422 - Validation Error
export class ValidationError extends AppError {
    public readonly errors: Record<string, string[]>;

    constructor(message: string = 'Validation failed', errors: Record<string, string[]> = {}) {
        super(message, 422);
        this.errors = errors;
    }
}

// 500 - Internal Server Error
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(message, 500, false);
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
            message: err.message,
            ...(err instanceof ValidationError && { errors: err.errors })
        });
        return;
    }

    // Handle validation errors from express-validator
    if (err.name === 'ValidationError') {
        res.status(422).json({
            status: 'error',
            message: 'Validation failed',
            errors: (err as ExpressValidationError).errors
        });
        return;
    }

    // Handle MongoDB duplicate key errors
    if ('code' in err && err.code === 11000) {
        res.status(409).json({
            status: 'error',
            message: 'Duplicate key error',
            field: Object.keys((err as MongoError).keyPattern)[0]
        });
        return;
    }

    // Log unexpected errors
    console.error('Unexpected error:', err);

    // Return generic error for non-operational errors
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
};