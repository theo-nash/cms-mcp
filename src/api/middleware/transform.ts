import { Request, Response, NextFunction } from "express";

/**
 * Transform date string fields to Date objects
 */
export function transformDates(fields: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        for (const field of fields) {
            if (req.body[field] && typeof req.body[field] === 'string') {
                try {
                    req.body[field] = new Date(req.body[field]);
                } catch (error) {
                    // If conversion fails, continue and let validation handle it
                }
            }
        }
        next();
    };
}

/**
 * Sanitize request body to only include allowed fields
 */
export function sanitizeBody(allowedFields: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const sanitized: Record<string, any> = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                sanitized[field] = req.body[field];
            }
        }

        req.body = sanitized;
        next();
    };
}

/**
 * Transform snake_case fields to camelCase for nested objects
 */
export function transformCasing(fieldMappings: Record<string, string>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        for (const [snakeCase, camelCase] of Object.entries(fieldMappings)) {
            if (req.body[snakeCase] !== undefined) {
                req.body[camelCase] = req.body[snakeCase];
                delete req.body[snakeCase];
            }
        }
        next();
    };
}