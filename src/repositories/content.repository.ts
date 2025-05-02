import { Collection, ObjectId } from "mongodb";
import { BaseRepository } from "./base.repository.js";
import { Content, ContentParser, ContentSchema, ContentState } from "../models/content.model.js";
import { MicroPlan, MicroPlanSchema, Plan } from "../models/plan.model.js";
import { PlanType } from "../models/plan.model.js";
import { MasterPlanSchema } from "../models/plan.model.js";
import { MasterPlan } from "../models/plan.model.js";
import { deepMerge } from "../utils/merge.js";

/**
 * Repository for content collection
 */
export class ContentRepository extends BaseRepository<Content> {
    constructor() {
        super("contents", ContentParser);
    }

    /**
     * Find all content by micro plan ID
     */
    async findByMicroPlanId(microPlanId: string): Promise<Content[]> {
        return this.find({ microPlanId, isActive: true });
    }

    /**
     * Find all content by brand ID (standalone content)
     */
    async findByBrandId(brandId: string): Promise<Content[]> {
        return this.find({ brandId, isActive: true });
    }

    /**
     * Find all content scheduled before a date
     */
    async findScheduledBefore(date: Date): Promise<Content[]> {
        return this.find({
            "stateMetadata.scheduledFor": { $lte: date },
            isActive: true
        });
    }

    /**
     * Find all content with a scheduled date
     */
    async findWithScheduledDate(): Promise<Content[]> {
        return this.find({
            "stateMetadata.scheduledFor": { $exists: true, $ne: null },
            isActive: true
        });
    }

    /**
     * Find content by state
     */
    async findByState(state: ContentState): Promise<Content[]> {
        return this.find({ state, isActive: true });
    }

    /**
     * Find active version by root content ID
     */
    async findActiveVersionByRoot(rootId: string): Promise<Content | null> {
        const results = await this.find({
            $or: [
                { _id: rootId, isActive: true },
                { rootContentId: rootId, isActive: true }
            ]
        });

        return results.length > 0 ? results[0] : null;
    }

    /**
     * Find all versions of content by root ID
     */
    async findAllVersionsByRoot(rootId: string): Promise<Content[]> {
        return this.find({
            $or: [
                { _id: rootId },
                { rootContentId: rootId }
            ]
        });
    }

    /**
     * Find specific version of content by root ID and version number
     */
    async findVersionByRoot(rootId: string, version: number): Promise<Content | null> {
        const results = await this.find({
            $or: [
                { _id: rootId, version },
                { rootContentId: rootId, version }
            ]
        });

        return results.length > 0 ? results[0] : null;
    }

    /**
     * Deactivate all versions of content with the same root
     */
    async deactivateAllVersionsByRoot(rootId: string): Promise<void> {
        await this.initCollection();

        await this.collection.updateMany(
            {
                $or: [
                    { _id: this.toObjectId(rootId) },
                    { rootContentId: rootId }
                ]
            },
            { $set: { isActive: false } }
        );
    }

    /**
     * Find content that need to be published - they're in Ready state with scheduledFor date in the past
     */
    async findContentReadyToPublish(): Promise<Content[]> {
        const now = new Date();
        return this.find({
            state: ContentState.Ready,
            "stateMetadata.scheduledFor": { $lte: now },
            isActive: true
        });
    }

    /**
     * Override find method to only return active versions by default
     */
    async find(query: any = {}): Promise<Content[]> {
        // If query doesn't specify isActive, only return active versions
        if (query.isActive === undefined) {
            query.isActive = true;
        }

        return super.find(query);
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