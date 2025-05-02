/**
 * Date utilities for consistent date handling throughout the application
 */

/**
 * Converts any value to a Date object if possible
 * - Handles Date objects
 * - Handles ISO strings
 * - Handles MongoDB BSON date objects
 * - Returns undefined for invalid dates
 */
export function toDate(value: any): Date | undefined {
    if (!value) return undefined;

    // Already a Date object
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? undefined : value;
    }

    // String (ISO format)
    if (typeof value === "string") {
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
    }

    // MongoDB BSON format
    if (value.$date) {
        const date = new Date(value.$date);
        return isNaN(date.getTime()) ? undefined : date;
    }

    return undefined;
}

/**
 * Converts a Date to an ISO string
 * Handles undefined values safely
 */
export function toISOString(date: Date | undefined | null): string | undefined {
    return date?.toISOString();
}

/**
 * Validates if a string is a valid ISO date string
 */
export function isValidISODateString(value: string): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Formats a date for display using Intl.DateTimeFormat
 */
export function formatDate(
    date: Date | string | undefined | null,
    options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    },
    locale = 'en-US'
): string | undefined {
    if (!date) return undefined;

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return undefined;

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Calculate duration between two dates in days
 */
export function getDurationInDays(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Create a new date set to a specific number of days in the future
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Zod schema helpers for consistent date validation
 */
import { z } from 'zod';

/**
 * Converts any value to a standardized Date object
 * Handles various input formats consistently
 */
export function normalizeDate(value: any): Date | undefined {
    if (!value) return undefined;

    // Already a Date object
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? undefined : value;
    }

    // String (ISO format or other parseable string)
    if (typeof value === "string") {
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
    }

    // MongoDB BSON format (various possible structures)
    if (typeof value === 'object') {
        // Extended JSON format
        if (value.$date) {
            const timestamp = typeof value.$date === 'number'
                ? value.$date
                : typeof value.$date === 'string'
                    ? Date.parse(value.$date)
                    : undefined;

            if (timestamp !== undefined) {
                const date = new Date(timestamp);
                return isNaN(date.getTime()) ? undefined : date;
            }
        }

        // MongoDB ISODate wrapped object
        if (value.toISOString && typeof value.toISOString === 'function') {
            try {
                return new Date(value.toISOString());
            } catch (e) {
                return undefined;
            }
        }
    }

    // Number (timestamp)
    if (typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : date;
    }

    return undefined;
}

/**
 * Ensures a value is a valid Date object
 * @throws Error if the value cannot be converted to a valid Date
 */
export function ensureDate(value: any, fieldName = 'date'): Date {
    const date = normalizeDate(value);
    if (!date) {
        throw new Error(`Invalid ${fieldName} value: ${JSON.stringify(value)}`);
    }
    return date;
}

/**
 * Standardized schema for date fields
 * Accepts many formats, always converts to Date objects
 */
export const dateSchema = z.preprocess(
    (val) => normalizeDate(val),
    z.date({
        required_error: "Date is required",
        invalid_type_error: "Invalid date format"
    })
);

/**
 * Standardized schema for optional date fields
 * Nulls are converted to undefined
 */
export const optionalDateSchema = z.preprocess(
    (val) => val === null ? undefined : normalizeDate(val),
    z.date({
        invalid_type_error: "Invalid date format"
    }).optional()
);

/**
 * Type guard to check if a value is likely a date field by name
 */
export function isDateFieldByName(fieldName: string): boolean {
    const dateFieldNames = [
        'date', 'created_at', 'updated_at', 'startDate', 'endDate',
        'scheduledFor', 'publishedAt', 'updatedAt', 'completedAt',
        'dueDate', 'expiresAt', 'activatedAt'
    ];

    return dateFieldNames.some(name =>
        fieldName === name ||
        fieldName.endsWith('Date') ||
        fieldName.endsWith('At')
    );
}

/**
 * Process an object to normalize all date fields
 */
export function normalizeDocumentDates(data: any): any {
    if (!data) return data;

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => normalizeDocumentDates(item));
    }

    // Handle Date objects
    if (data instanceof Date) {
        return data;
    }

    // Only process objects
    if (typeof data !== 'object') return data;

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        if (isDateFieldByName(key)) {
            // Apply date normalization to known date fields
            result[key] = normalizeDate(value);
        } else if (value && typeof value === 'object' && !(value instanceof Date)) {
            // Recursively process nested objects
            result[key] = normalizeDocumentDates(value);
        } else {
            // Pass through other values
            result[key] = value;
        }
    }

    return result;
}

export function provideDefaultsForMissingFields(data: any): any {
    if (!data) return data;

    // Handle arrays recursively
    if (Array.isArray(data)) {
        return data.map(item => provideDefaultsForMissingFields(item));
    }

    // Special case for Date objects - preserve them
    if (data instanceof Date) {
        return data;
    }

    // Only process objects
    if (typeof data !== 'object') return data;

    const result = { ...data };

    // Common date fields that are often required
    const dateFields = [
        'startDate',
        'endDate',
        'date',
        'scheduledFor',
        'publishedAt',
        'dueDate',
        'completedAt'
    ];

    // Provide default values ONLY for missing or null date fields, 
    // not for existing Date objects even if they're epoch dates
    for (const field of dateFields) {
        if (result[field] === undefined || result[field] === null) {
            // Use a placeholder date (epoch) that's clearly a placeholder
            result[field] = new Date(0); // January 1, 1970
        }
    }

    // Handle nested objects
    for (const [key, value] of Object.entries(result)) {
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            result[key] = provideDefaultsForMissingFields(value);
        }
    }

    return result;
}