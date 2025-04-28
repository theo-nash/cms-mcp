import { BaseRepository } from "./base.repository.js";
import { Content, ContentSchema, ContentState } from "../models/content.model.js";

export class ContentRepository extends BaseRepository<Content> {
    constructor() {
        super("contents", ContentSchema);
    }

    /**
     * Find content by plan ID
     */
    async findByPlanId(planId: string): Promise<Content[]> {
        await this.initCollection();
        const results = await this.collection.find({ planId }).toArray();

        return results.map(result => {
            // Convert _id to string
            const document = {
                ...result,
                _id: this.fromObjectId(result._id)
            };

            return this.validate(document);
        });
    }

    /**
     * Find content by brand ID
     */
    async findByBrandId(brandId: string): Promise<Content[]> {
        await this.initCollection();
        const results = await this.collection.find({ brandId }).toArray();

        return results.map(result => {
            // Convert _id to string
            const document = {
                ...result,
                _id: this.fromObjectId(result._id)
            };

            return this.validate(document);
        });
    }

    /**
     * Find scheduled content that should be published
     */
    async findScheduledBefore(date: Date): Promise<Content[]> {
        await this.initCollection();
        const results = await this.collection.find({
            state: ContentState.Ready,
            "stateMetadata.scheduledFor": { $lte: date }
        }).toArray();

        return results.map(result => {
            // Convert _id to string
            const document = {
                ...result,
                _id: this.fromObjectId(result._id)
            };

            return this.validate(document);
        });
    }
}