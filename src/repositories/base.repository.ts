import { Collection, ObjectId, Document, OptionalId } from "mongodb";
import { getDatabase } from "../config/db.js";
import { z } from "zod";
import { deepMerge } from "../utils/merge.js";
import { toDate } from "../utils/date.utils.js";
import { stripNullValues } from "../utils/nulls.js";

/**
 * Base repository for MongoDB collections
 */
export abstract class BaseRepository<T extends Document> {
    protected collection!: Collection;
    protected schema: z.ZodType<T, z.ZodTypeDef, any>;
    private collectionName: string;

    constructor(collectionName: string, schema: z.ZodType<T, z.ZodTypeDef, any>) {
        this.collectionName = collectionName;
        this.schema = schema;
    }

    /**
     * Initialize the collection
     */
    protected async initCollection(): Promise<void> {
        if (!this.collection) {
            const db = getDatabase();
            this.collection = db.collection(this.collectionName);
        }
    }

    /**
     * Convert string ID to ObjectId
     */
    protected toObjectId(id: string): ObjectId {
        return new ObjectId(id);
    }

    /**
     * Convert ObjectId to string
     */
    protected fromObjectId(id: ObjectId): string {
        return id.toString();
    }

    /**
     * Recursively process all date fields in an object
     * This ensures consistent handling of dates from MongoDB
     */
    protected processDateFields(data: any): any {
        if (!data) return data;

        // If data is an array, process each item
        if (Array.isArray(data)) {
            return data.map(item => this.processDateFields(item));
        }

        // If not an object, return as is
        if (typeof data !== 'object') return data;

        // If it's a Date object, ensure it's valid
        if (data instanceof Date) {
            return isNaN(data.getTime()) ? undefined : data;
        }

        // Handle MongoDB date format variations
        // MongoDB BSON extended JSON format (for direct queries)
        if (data && typeof data === 'object' && '$date' in data) {
            return toDate(data);
        }

        // Handle ISODate string format
        if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
            return new Date(data);
        }

        // Special handling for MongoDB date objects that might be serialized in various ways
        if (typeof data === 'object' &&
            Object.keys(data).length === 0 &&
            !(data instanceof Date)) {
            // Empty object where a date should be - provide default
            return new Date(0);
        }

        // Process all properties of the object
        const processed: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            // Common date field names
            const isDateField =
                key === 'created_at' ||
                key === 'updated_at' ||
                key === 'startDate' ||
                key === 'endDate' ||
                key === 'date' ||
                key === 'scheduledFor' ||
                key === 'publishedAt' ||
                key === 'updatedAt' ||
                key === 'completedAt' ||
                key === 'dueDate';

            if (isDateField && value) {
                // Extended date handling
                if (value instanceof Date) {
                    processed[key] = value;
                } else if (typeof value === 'string') {
                    // Try to parse as ISO date
                    processed[key] = new Date(value);
                } else if (typeof value === 'object' && '$date' in value) {
                    // MongoDB extended JSON format
                    processed[key] = toDate(value);
                } else if (typeof value === 'object' && Object.keys(value).length === 0) {
                    // Empty object where a date should be - provide default
                    processed[key] = new Date(0);
                } else {
                    // Try toDate utility as last resort
                    try {
                        processed[key] = toDate(value);
                    } catch (e) {
                        // If all else fails, use a default date
                        processed[key] = new Date(0);
                    }
                }
            } else if (key === 'majorMilestones' && Array.isArray(value)) {
                // Special handling for majorMilestones array
                processed[key] = value.map(milestone => {
                    if (!milestone) return milestone;

                    // Create a new milestone object with processed date
                    const processedMilestone = { ...milestone };

                    if (milestone.date) {
                        if (milestone.date instanceof Date) {
                            processedMilestone.date = milestone.date;
                        } else if (typeof milestone.date === 'string') {
                            processedMilestone.date = new Date(milestone.date);
                        } else if (typeof milestone.date === 'object' && '$date' in milestone.date) {
                            processedMilestone.date = toDate(milestone.date);
                        } else if (typeof milestone.date === 'object' && Object.keys(milestone.date).length === 0) {
                            // Empty object where a date should be
                            processedMilestone.date = new Date(0);
                        } else {
                            // Try general conversion
                            try {
                                processedMilestone.date = toDate(milestone.date);
                            } catch (e) {
                                processedMilestone.date = new Date(0);
                            }
                        }
                    } else {
                        // Missing date field
                        processedMilestone.date = new Date(0);
                    }

                    return processedMilestone;
                });
            } else if (typeof value === 'object' && value !== null) {
                // Recursively process nested objects
                processed[key] = this.processDateFields(value);
            } else {
                // Pass through other values
                processed[key] = value;
            }
        }

        return processed;
    }


    /**
     * Provide default values for required fields that are missing
     * Especially focused on date fields that are often required
     */
    protected provideDefaultsForMissingFields(data: any): any {
        if (!data) return data;

        // Handle arrays recursively
        if (Array.isArray(data)) {
            return data.map(item => this.provideDefaultsForMissingFields(item));
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

        // Provide default values for common required date fields if they're missing
        for (const field of dateFields) {
            if (result[field] === undefined || result[field] === null) {
                // Use a placeholder date (epoch) that's clearly a placeholder
                result[field] = new Date(0); // January 1, 1970
            }
        }

        // Handle nested objects
        for (const [key, value] of Object.entries(result)) {
            if (value && typeof value === 'object' && !(value instanceof Date)) {
                result[key] = this.provideDefaultsForMissingFields(value);
            }
        }

        // Special handling for milestone arrays which commonly have date issues
        if (result.majorMilestones && Array.isArray(result.majorMilestones)) {
            result.majorMilestones = result.majorMilestones.map((milestone: any) => {
                if (!milestone) return milestone;

                // Ensure each milestone has a date
                if (milestone.date === undefined || milestone.date === null) {
                    milestone.date = new Date(0);
                }
                return milestone;
            });
        }

        return result;
    }

    /**
     * Ensure schema defaults are applied for missing values
     * This replaces null values with defaults from the schema where applicable
     */
    protected applySchemaDefaults(data: any, schemaObj?: z.ZodType<any>): any {
        const schema = schemaObj || this.schema;

        try {
            // Try parsing with schema defaults
            const result = schema.parse(data);
            return result;
        } catch (error) {
            // If validation fails, return the original data
            // It will be handled by the validation step later
            return data;
        }
    }

    /**
     * Validate data against schema
     */
    protected validate(data: any): T {
        // Process date fields before validation
        const processedData = this.processDateFields(data);

        // Apply schema defaults where possible
        const dataWithDefaults = this.applySchemaDefaults(processedData);

        try {
            const validated = this.schema.parse(dataWithDefaults);
            return validated as T;
        } catch (error) {
            // First try stripping null values
            const strippedData = stripNullValues(dataWithDefaults);

            try {
                const validated = this.schema.parse(strippedData);
                return validated as T;
            } catch (secondError: any) {
                // If that fails, provide default values for required fields
                const dataWithDefaultValues = this.provideDefaultsForMissingFields(strippedData);

                try {
                    const validated = this.schema.parse(dataWithDefaultValues);
                    return validated as T;
                } catch (thirdError: any) {
                    // Only throw if all approaches fail
                    throw new Error(`Validation failed even after applying defaults: ${thirdError.message}`);
                }
            }
        }
    }

    /**
     * Find documents by query
     */
    async find(query: any = {}): Promise<T[]> {
        await this.initCollection();
        const results = await this.collection.find(query).toArray();
        return results.map(result => {
            const document = {
                ...result,
                _id: this.fromObjectId(result._id),
            };

            // Pass through validation to ensure all fields are properly formatted
            return this.validate(document);
        });
    }

    /**
     * Fine a single document by query
     */
    async findOne(query: any = {}): Promise<T | null> {
        await this.initCollection();
        const result = await this.collection.findOne(query);
        if (!result) return null;

        const document = {
            ...result,
            _id: this.fromObjectId(result._id),
        };
        return this.validate(document);
    }

    /**
     * Find document by ID
     */
    async findById(id: string): Promise<T | null> {
        await this.initCollection();
        const result = await this.collection.findOne({ _id: this.toObjectId(id) });

        if (!result) return null;

        const document = {
            ...result,
            _id: this.fromObjectId(result._id),
        };

        // Pass through validation to ensure all fields are properly formatted
        return this.validate(document);
    }

    /**
     * Create a new document
     */
    async create(data: Omit<T, "_id" | "created_at" | "updated_at">): Promise<T> {
        await this.initCollection();
        const now = new Date();
        const dataWithTimestamps = {
            ...data,
            created_at: now,
            updated_at: now,
        } as unknown as Omit<T, "_id">;

        // Validate and strip nulls before saving
        const validatedData = this.validate(dataWithTimestamps as unknown as T);
        const cleanedData = stripNullValues(validatedData) as any;

        const result = await this.collection.insertOne(cleanedData);

        return {
            ...validatedData,
            _id: this.fromObjectId(result.insertedId)
        } as T;
    }

    /**
    * Update a document
    */
    async update(id: string, data: Partial<Omit<T, "_id">>): Promise<T | null> {
        await this.initCollection();
        const existingDoc = await this.findById(id);
        if (!existingDoc) return null;

        // Process date fields in the update data
        const processedData = this.processDateFields(data);

        // Strip null values from the update data
        const cleanedData = stripNullValues(processedData) || {};

        // Use deep merge to preserve nested data
        const updatedDoc = deepMerge(existingDoc, {
            ...cleanedData,
            updated_at: new Date()
        } as unknown as Partial<typeof existingDoc>);

        // Create a copy without _id for the update operation
        const { _id, ...updateData } = updatedDoc as any;

        await this.collection.updateOne(
            { _id: this.toObjectId(id) },
            { $set: updateData }
        );

        return updatedDoc;
    }

    /**
     * Delete a document
     */
    async delete(id: string): Promise<boolean> {
        await this.initCollection();
        const result = await this.collection.deleteOne({ _id: this.toObjectId(id) });
        return result.deletedCount === 1;
    }
}