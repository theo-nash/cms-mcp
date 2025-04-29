import { BaseRepository } from "./base.repository.js";
import { Content, ContentSchema, ContentState } from "../models/content.model.js";
import { MicroPlan, MicroPlanSchema, Plan } from "../models/plan.model.js";
import { PlanType } from "../models/plan.model.js";
import { MasterPlanSchema } from "../models/plan.model.js";
import { MasterPlan } from "../models/plan.model.js";

export class ContentRepository extends BaseRepository<Content> {
    constructor() {
        super("contents", ContentSchema);
    }

    /**
     * Find content by micro plan ID
     */
    async findByMicroPlanId(microPlanId: string): Promise<Content[]> {
        await this.initCollection();
        const results = await this.collection.find({ microPlanId }).toArray();

        return results.map(result => {
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
            const document = {
                ...result,
                _id: this.fromObjectId(result._id)
            };
            return this.validate(document);
        });
    }

    /**
    * Find content with scheduled dates
    */
    async findWithScheduledDate(): Promise<Content[]> {
        await this.initCollection();
        const results = await this.collection.find({
            "stateMetadata.scheduledFor": { $exists: true }
        }).toArray();

        return results.map(result => {
            const document = {
                ...result,
                _id: this.fromObjectId(result._id)
            };
            return this.validate(document);
        });
    }

    /**
     * Find content by state
     */
    async findByState(state: ContentState): Promise<Content[]> {
        await this.initCollection();
        const results = await this.collection.find({ state }).toArray();

        return results.map(result => {
            const document = {
                ...result,
                _id: this.fromObjectId(result._id)
            };
            return this.validate(document);
        });
    }

    async update(id: string, updates: Partial<Omit<Content, "_id">>): Promise<Content | null> {
        await this.initCollection();

        // Get current content
        const existingContent = await this.findById(id);
        if (!existingContent) return null;

        // Special handling for stateMetadata to ensure we don't completely overwrite it
        if (updates.stateMetadata && existingContent.stateMetadata) {
            updates.stateMetadata = {
                ...existingContent.stateMetadata,
                ...updates.stateMetadata
            };
        }

        // Special handling for publishedMetadata
        if (updates.publishedMetadata && existingContent.publishedMetadata) {
            updates.publishedMetadata = {
                ...existingContent.publishedMetadata,
                ...updates.publishedMetadata
            };
        }

        // Merge updates with existing content
        const contentToUpdate = {
            ...existingContent,
            ...updates,
            updated_at: new Date()
        };

        // Validate
        const validatedContent = this.validate(contentToUpdate);

        // Remove _id for update
        const { _id, ...updateData } = validatedContent as any;

        // Perform update
        await this.collection.updateOne(
            { _id: this.toObjectId(id) },
            { $set: updateData }
        );

        return validatedContent;
    }
}