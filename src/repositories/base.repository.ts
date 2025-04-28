import { Collection, ObjectId, Document, OptionalId } from "mongodb";
import { getDatabase } from "../config/db.js";
import { z } from "zod";

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
     * Validate data against schema
     */
    protected validate(data: any): T {
        const validated = this.schema.parse(data);
        return validated as T;
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
        const dataWithTimestamps = {
            ...data,
            created_at: now,
            updated_at: now,
        } as unknown as Omit<T, "_id">;

        const validatedData = this.validate(dataWithTimestamps as unknown as T);

        const result = await this.collection.insertOne(validatedData as any);

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

        const updatedDoc = {
            ...existingDoc,
            ...data,
            updated_at: new Date()
        };

        const validatedDoc = this.validate(updatedDoc);

        // Create a copy without the _id field for the update operation
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...updateData } = validatedDoc as any;

        await this.collection.updateOne(
            { _id: this.toObjectId(id) },
            { $set: updateData }
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