import { Collection, ObjectId, Document, OptionalId } from "mongodb";
import { getDatabase } from "../config/db.js";
import { z } from "zod";

/**
 * Base repository for MongoDB collections
 */
export abstract class BaseRepository<T extends Document> {
    protected collection!: Collection;
    protected schema: z.ZodObject<any, any, any>
    private collectionName: string;

    constructor(collectionName: string, schema: z.ZodObject<any, any, any>) {
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
     * Validate data against schema
     */
    protected validate(data: any): T {
        const validated = this.schema.parse(data);
        return validated as T; // Explicit cast to type T
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
                _id: this.fromObjectId(result._id)
            };
            return this.validate(document);
        });
    }

    /**
     * Find document by ID
     */
    async findById(id: string): Promise<T | null> {
        await this.initCollection();
        const result = await this.collection.findOne({ _id: this.toObjectId(id) });

        if (!result) return null;

        // Convert _id to string
        const document = {
            ...result,
            _id: this.fromObjectId(result._id)
        };

        return this.validate(document);
    }

    /**
     * Create a new document
     */
    async create(data: Omit<T, "_id" | "created_at" | "updated_at">): Promise<T> {
        await this.initCollection();
        const now = new Date();
        // Ensure timestamps are always set
        const dataWithTimestamps = {
            ...data,
            created_at: now,
            updated_at: now,
        } as unknown as Omit<T, "_id">;

        // Validate data
        const validatedData = this.validate(dataWithTimestamps as unknown as T);

        // Insert document
        const result = await this.collection.insertOne(validatedData as any);

        // Return created document with ID
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
        // Find existing document
        const existingDoc = await this.findById(id);
        if (!existingDoc) return null;

        // Merge with updates
        const updatedDoc = {
            ...existingDoc,
            ...data,
            updated_at: new Date()
        };

        // Validate updated document
        const validatedDoc = this.validate(updatedDoc);

        // Update in database
        await this.collection.updateOne(
            { _id: this.toObjectId(id) },
            { $set: validatedDoc }
        );

        return validatedDoc;
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