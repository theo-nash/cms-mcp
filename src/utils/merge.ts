/**
 * Deep merges a source object into a target object with better TypeScript support
 */
export function deepMerge<T extends object, U extends Partial<T>>(target: T, source: U): T {
    if (!source) return target;
    if (!target) return source as unknown as T;

    // Create a copy of the target
    const result = { ...target };

    Object.keys(source).forEach(key => {
        const sourceValue = source[key as keyof U];
        const targetValue = target[key as keyof T];

        // Skip undefined values to prevent overwriting
        if (sourceValue === undefined) return;

        // Handle nested objects (but not arrays or null)
        if (
            typeof sourceValue === 'object' &&
            sourceValue !== null &&
            !Array.isArray(sourceValue) &&
            typeof targetValue === 'object' &&
            targetValue !== null &&
            !Array.isArray(targetValue)
        ) {
            // Recursively merge nested objects
            (result as any)[key] = deepMerge(
                targetValue as object,
                sourceValue as Partial<typeof targetValue>
            );
        } else {
            // For primitives, arrays, or if target doesn't have property
            (result as any)[key] = sourceValue;
        }
    });

    return result;
}

/**
 * Merges arrays of objects with better TypeScript support
 */
export function deepMergeArrays<T extends { [key: string]: any }>(
    target: T[],
    source: Partial<T>[],
    key: keyof T
): T[] {
    if (!source || !source.length) return target;
    if (!target || !target.length) return source as T[];

    const result = [...target];

    source.forEach(sourceItem => {
        // Find matching item in target array
        const targetIndex = result.findIndex(targetItem =>
            targetItem[key] === sourceItem[key]
        );

        if (targetIndex >= 0) {
            // If found, merge with existing item
            result[targetIndex] = deepMerge(result[targetIndex], sourceItem);
        } else {
            // Otherwise add as new item
            result.push(sourceItem as T);
        }
    });

    return result;
}

export function cleanNulls(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(cleanNulls);
    } else if (obj && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== null)
                .map(([k, v]) => [k, cleanNulls(v)])
        );
    }
    return obj;
}

// Export the toDate function from the date utils
export { toDate } from "./date.utils.js";