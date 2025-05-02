/**
     * Recursively strip null values from an object
     * This ensures nulls aren't saved to the database where they might cause schema validation issues
     */
export function stripNullValues(data: any): any {
    if (data === null || data === undefined) return undefined;

    // Special case for Date objects - preserve them exactly as they are
    if (data instanceof Date) {
        return data;
    }

    // If data is an array, process each item
    if (Array.isArray(data)) {
        const filteredArray = data
            .map(item => stripNullValues(item))
            .filter(item => item !== undefined);
        return filteredArray.length > 0 ? filteredArray : undefined;
    }

    // If not an object, return as is
    if (typeof data !== 'object') return data;

    // Process all properties of the object
    const processed: Record<string, any> = {};
    let hasValues = false;

    for (const [key, value] of Object.entries(data)) {
        const processedValue = stripNullValues(value);
        if (processedValue !== undefined) {
            processed[key] = processedValue;
            hasValues = true;
        }
    }

    return hasValues ? processed : undefined;
}