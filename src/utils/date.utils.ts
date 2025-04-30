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
 * Ensures a value is a valid Date object
 * @throws Error if the value cannot be converted to a valid Date
 */
export function ensureDate(value: any, fieldName = 'date'): Date {
    const date = toDate(value);
    if (!date) {
        throw new Error(`Invalid ${fieldName} value: ${value}`);
    }
    return date;
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
 * Creates a Zod schema for date fields that accepts:
 * - ISO date strings
 * - Date objects
 * 
 * Always transforms the value to a Date object
 */
export const dateSchema = z.union([
    z.string().refine(
        val => !isNaN(new Date(val).getTime()),
        { message: 'Invalid date string format' }
    ),
    z.date()
]).transform(val => ensureDate(val));

/**
 * Creates a Zod schema for optional date fields
 */
export const optionalDateSchema = dateSchema.optional(); 