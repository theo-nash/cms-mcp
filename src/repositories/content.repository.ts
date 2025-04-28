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
}