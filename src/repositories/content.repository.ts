import { BaseRepository } from "./base.repository.js";
import { Content, ContentSchema, ContentState } from "../models/content.model.js";
import { MicroPlan, MicroPlanSchema, Plan } from "../models/plan.model.js";
import { PlanType } from "../models/plan.model.js";
import { MasterPlanSchema } from "../models/plan.model.js";
import { MasterPlan } from "../models/plan.model.js";
import { deepMerge } from "../utils/merge.js";

export class ContentRepository extends BaseRepository<Content> {
    constructor() {
        super("contents", ContentSchema);
    }

    /**
     * Find content by micro plan ID
     */
    async findByMicroPlanId(microPlanId: string): Promise<Content[]> {
        await this.initCollection();
        return await this.find({ microPlanId })
    }

    /**
     * Find content by brand ID
     */
    async findByBrandId(brandId: string): Promise<Content[]> {
        return await this.find({ brandId })
    }

    /**
     * Find scheduled content that should be published
     */
    async findScheduledBefore(date: Date): Promise<Content[]> {
        return await this.find({
            state: ContentState.Ready,
            "stateMetadata.scheduledFor": { $lte: date }
        });
    }

    /**
    * Find content with scheduled dates
    */
    async findWithScheduledDate(): Promise<Content[]> {
        return await this.find({
            "stateMetadata.scheduledFor": { $exists: true }
        })
    }

    /**
     * Find content by state
     */
    async findByState(state: ContentState): Promise<Content[]> {
        return await this.find({ state });
    }

    async update(id: string, updates: Partial<Omit<Content, "_id">>): Promise<Content | null> {
        // Get current content
        const existingContent = await this.findById(id);
        if (!existingContent) return null;

        // Process updates
        const processedUpdates = { ...updates };

        // Special handling for all nested objects
        if (updates.stateMetadata && existingContent.stateMetadata) {
            processedUpdates.stateMetadata = deepMerge(
                existingContent.stateMetadata,
                updates.stateMetadata
            );
        }

        if (updates.publishedMetadata && existingContent.publishedMetadata) {
            processedUpdates.publishedMetadata = deepMerge(
                existingContent.publishedMetadata,
                updates.publishedMetadata
            );
        }

        if (updates.mediaRequirements && existingContent.mediaRequirements) {
            processedUpdates.mediaRequirements = deepMerge(
                existingContent.mediaRequirements,
                updates.mediaRequirements
            );
        }

        // Handle arrays
        if (updates.keywords && existingContent.keywords) {
            // Ensure no duplicates in keywords
            const combinedKeywords = [...existingContent.keywords];
            updates.keywords.forEach(keyword => {
                if (!combinedKeywords.includes(keyword)) {
                    combinedKeywords.push(keyword);
                }
            });
            processedUpdates.keywords = combinedKeywords;
        }

        // Apply merged updates
        const contentToUpdate = deepMerge(existingContent, {
            ...processedUpdates,
            updated_at: new Date()
        });

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