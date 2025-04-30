import { BaseRepository } from "./base.repository.js";
import { Brand, BrandSchema } from "../models/brand.model.js";
import { toDate } from "../utils/merge.js";

export class BrandRepository extends BaseRepository<Brand> {
    constructor() {
        super("brands", BrandSchema);
    }

    /**
     * Find brand by name
     */
    async findByName(name: string): Promise<Brand | null> {
        await this.initCollection();
        const result = await this.collection.findOne({ name });

        if (!result) return null;

        // Convert _id to string
        const document = {
            ...result,
            _id: this.fromObjectId(result._id),
            created_at: toDate(result.created_at),
            updated_at: toDate(result.updated_at)
        };

        return this.validate(document);
    }
}