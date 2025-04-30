import { toISOString } from "./date.utils.js";

/**
 * Recursively transforms Date objects to ISO strings for API responses
 * This ensures consistent date formatting in API responses
 */
export function formatDatesForResponse(data: any): any {
    if (!data) return data;

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => formatDatesForResponse(item));
    }

    // If not an object, return as is
    if (typeof data !== 'object') return data;

    // If it's a Date object, convert to ISO string
    if (data instanceof Date) {
        return data.toISOString();
    }

    // Process all properties of the object
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        if (value instanceof Date) {
            // Convert Date to ISO string
            processed[key] = value.toISOString();
        } else if (typeof value === 'object' && value !== null) {
            // Recursively process nested objects
            processed[key] = formatDatesForResponse(value);
        } else {
            // Pass through other values
            processed[key] = value;
        }
    }

    return processed;
}

/**
 * Middleware to format dates in API responses
 */
export function formatResponseDates(req: any, res: any, next: any) {
    const originalJson = res.json;

    res.json = function (data: any) {
        const formattedData = formatDatesForResponse(data);
        return originalJson.call(this, formattedData);
    };

    next();
}

/**
 * Format a single API response to ensure consistent date formatting
 * Use this in specific routes that need custom response handling
 */
export function formatApiResponse<T>(data: T): T {
    return formatDatesForResponse(data) as T;
} 