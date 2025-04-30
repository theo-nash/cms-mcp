import { Content, ContentCreationParams, ContentCreationSchemaParser, ContentState, ContentUpdateParams } from "../models/content.model.js";
import { ContentRepository } from "../repositories/content.repository.js";
import { PlanRepository } from "../repositories/plan.repository.js";
import { BrandRepository } from "../repositories/brand.repository.js";
import { CampaignRepository } from "../repositories/campaign.repository.js";
import { PlanType, MicroPlan, MasterPlan } from "../models/plan.model.js";
import { ensureDate } from "../utils/date.utils.js";

export interface ContentCreationData {
    microPlanId?: string;
    brandId?: string;
    title: string;
    content: string;
    userId: string;
    scheduledFor?: Date;
    comments?: string;
    format?: string;
    platform?: string;
    mediaRequirements?: {
        type: string;
        description: string;
    };
    targetAudience?: string;
    keywords?: string[];
}

export interface StateTransitionMetadata {
    userId: string;
    comments?: string;
}

export class ContentService {
    private contentRepository: ContentRepository;
    private planRepository: PlanRepository;
    private brandRepository: BrandRepository;
    private campaignRepository: CampaignRepository;

    constructor() {
        this.contentRepository = new ContentRepository();
        this.planRepository = new PlanRepository();
        this.brandRepository = new BrandRepository();
        this.campaignRepository = new CampaignRepository();
    }

    /**
     * Get all content
     */
    async getAllContent(): Promise<Content[]> {
        return await this.contentRepository.find({});
    }

    /**
     * Get content by micro plan ID
     */
    async getContentByMicroPlanId(microPlanId: string): Promise<Content[]> {
        return await this.contentRepository.findByMicroPlanId(microPlanId);
    }

    /**
     * Get content by brand ID (for standalone content)
     */
    async getContentByBrandId(brandId: string): Promise<Content[]> {
        return await this.contentRepository.findByBrandId(brandId);
    }

    /**
     * Create new content
     */
    async createContent(data: ContentCreationParams): Promise<Content> {
        data = ContentCreationSchemaParser.parse(data);

        // Validate that either microPlanId or brandId is provided
        if (!data.microPlanId && !data.brandId) {
            throw new Error("Either microPlanId or brandId must be provided");
        }

        // If microPlanId is provided, verify it exists
        if (data.microPlanId) {
            const microPlan = await this.planRepository.findById(data.microPlanId);
            if (!microPlan || microPlan.type !== PlanType.Micro) {
                throw new Error(`Micro plan with ID ${data.microPlanId} not found`);
            }
        }

        // If brandId is provided, verify it exists
        if (data.brandId) {
            const brand = await this.brandRepository.findById(data.brandId);
            if (!brand) {
                throw new Error(`Brand with ID ${data.brandId} not found`);
            }
        }

        // Create state metadata
        const stateMetadata = {
            updatedAt: new Date(),
            updatedBy: "system-user",
            comments: "",
            ...(data.scheduledFor && { scheduledFor: data.scheduledFor })
        };

        // Strip scheduledFor from data if it is provided (been moved to stateMetadata)
        const { scheduledFor, ...rest } = data;

        // Create the content with initial state
        return await this.contentRepository.create({
            ...rest,
            state: ContentState.Draft,
            stateMetadata
        });
    }

    /**
     * Get content by ID
     */
    async getContent(contentId: string): Promise<Content | null> {
        return await this.contentRepository.findById(contentId);
    }

    /**
     * Update content
     */
    async updateContent(updates: ContentUpdateParams): Promise<Content | null> {
        // Get current content
        const content = await this.contentRepository.findById(updates.content_id);
        if (!content) {
            throw new Error(`Content with ID ${updates.content_id} not found`);
        };

        // Only allow updates if content is not in Published state
        if (content.state === ContentState.Published) {
            throw new Error("Can only update content in Draft or Ready state");
        }

        // Update state metadata
        const stateMetadata = {
            ...content.stateMetadata,
            updatedAt: new Date(),
            updatedBy: "system-user",
            scheduledFor: updates.scheduledFor ? ensureDate(updates.scheduledFor, 'scheduledFor') : content.stateMetadata.scheduledFor
        };

        // update media requirements
        if (updates.mediaRequirements) {
            content.mediaRequirements = updates.mediaRequirements;
        }

        // Apply updates
        return await this.contentRepository.update(updates.content_id, {
            ...updates,
            stateMetadata
        });
    }

    /**
     * Schedule content for publication
     */
    async scheduleContent(contentId: string, publishAt: Date, userId: string): Promise<Content | null> {
        // Get current content
        const content = await this.contentRepository.findById(contentId);
        if (!content) return null;

        // Only allow scheduling if content is in Ready state
        if (content.state !== ContentState.Ready) {
            throw new Error("Can only schedule content in Ready state");
        }

        // Update state metadata
        const stateMetadata = {
            ...content.stateMetadata,
            updatedAt: new Date(),
            updatedBy: userId,
            scheduledFor: publishAt
        };

        // Apply the schedule
        return await this.contentRepository.update(contentId, {
            stateMetadata
        });
    }

    /**
    * Get all scheduled content, optionally filtered by state
    */
    async getScheduledContent(states?: ContentState[]): Promise<Content[]> {
        // Get all content that has a scheduledFor date
        const allContent = await this.contentRepository.findWithScheduledDate();

        // Filter by state if specified
        if (states && states.length > 0) {
            return allContent.filter(content => states.includes(content.state));
        }

        return allContent;
    }

    /**
     * Transition content state
     */
    async transitionContentState(
        contentId: string,
        targetState: ContentState,
        metadata: StateTransitionMetadata
    ): Promise<Content | null> {
        // Get current content
        const content = await this.contentRepository.findById(contentId);
        if (!content) return null;

        // Validate the transition
        this.validateStateTransition(content.state, targetState);

        // If transitioning to Ready, validate against brand guidelines
        if (targetState === ContentState.Ready) {
            await this.validateAgainstBrandGuidelines(content);
        }

        // Update state metadata
        const stateMetadata = {
            ...content.stateMetadata,
            updatedAt: new Date(),
            updatedBy: metadata.userId,
            comments: metadata.comments || content.stateMetadata.comments
        };

        // Create update object without _id field
        const updates: Partial<Omit<Content, "_id">> = {
            state: targetState,
            stateMetadata
        };

        // Apply the state change
        return await this.contentRepository.update(contentId, updates);
    }

    /**
     * Validate state transition
     */
    private validateStateTransition(currentState: ContentState, targetState: ContentState): void {
        // Define valid transitions
        const validTransitions: Record<ContentState, ContentState[]> = {
            [ContentState.Draft]: [ContentState.Ready],
            [ContentState.Ready]: [ContentState.Draft, ContentState.Published],
            [ContentState.Published]: [] // Terminal state
        };

        // Check if transition is valid
        if (!validTransitions[currentState].includes(targetState)) {
            throw new Error(`Invalid state transition from ${currentState} to ${targetState}`);
        }
    }

    /**
     * Validate content against brand guidelines
     */
    private async validateAgainstBrandGuidelines(content: Content): Promise<void> {
        let brandId: string | null = null;

        if (content.microPlanId) {
            // Get the micro plan
            const microPlan = await this.planRepository.findById(content.microPlanId) as MicroPlan;
            if (!microPlan || microPlan.type !== PlanType.Micro) {
                throw new Error(`Micro plan with ID ${content.microPlanId} not found`);
            }

            // Get the master plan
            const masterPlan = await this.planRepository.findById(microPlan.masterPlanId) as MasterPlan;
            if (!masterPlan || masterPlan.type !== PlanType.Master) {
                throw new Error(`Master plan with ID ${microPlan.masterPlanId} not found`);
            }

            // Get the campaign
            const campaign = await this.campaignRepository.findById(masterPlan.campaignId);
            if (!campaign) {
                throw new Error(`Campaign with ID ${masterPlan.campaignId} not found`);
            }

            brandId = campaign.brandId;
        } else if (content.brandId) {
            // For standalone content
            brandId = content.brandId;
        } else {
            throw new Error('Content must be associated with either a microplan or a brand');
        }

        // Get brand guidelines
        const brand = await this.brandRepository.findById(brandId);
        if (!brand || !brand.guidelines) {
            // No guidelines to validate against
            return;
        }

        const guidelines = brand.guidelines;
        const contentText = content.content.toLowerCase();

        // Check for avoided terms
        const foundAvoidedTerms = guidelines && guidelines.avoidedTerms && guidelines.avoidedTerms.filter(term =>
            contentText.includes(term.toLowerCase())
        );

        if (foundAvoidedTerms && foundAvoidedTerms.length > 0) {
            throw new Error(`Content contains avoided terms: ${foundAvoidedTerms.join(', ')}`);
        }
    }

    /**
     * Get content by master plan ID
     */
    async getContentByMasterPlanId(masterPlanId: string): Promise<Content[]> {
        // Get all micro plans for this master plan
        const microPlans = await this.planRepository.findMicroPlansByMasterId(masterPlanId);

        // Get content for each micro plan
        const contentPromises = microPlans.map(microPlan =>
            this.contentRepository.findByMicroPlanId(microPlan._id!)
        );

        const contentArrays = await Promise.all(contentPromises);
        return contentArrays.flat();
    }

    /**
     * Get content by campaign ID
     */
    async getContentByCampaignId(campaignId: string): Promise<Content[]> {
        // Get all master plans for this campaign
        const masterPlans = await this.planRepository.findMasterPlansByCampaignId(campaignId);

        // Get content for each master plan
        const contentPromises = masterPlans.map(masterPlan =>
            this.getContentByMasterPlanId(masterPlan._id!)
        );

        const contentArrays = await Promise.all(contentPromises);
        return contentArrays.flat();
    }

    async updatePublishedMetadata(
        contentId: string,
        publishedMetadata: {
            url?: string;
            postId?: string;
            platformSpecificData?: Record<string, any>;
        },
        userId: string
    ): Promise<Content | null> {
        const content = await this.getContent(contentId);
        if (!content) return null;

        // Update the content
        return await this.contentRepository.update(contentId, {
            publishedMetadata,
            stateMetadata: {
                ...content.stateMetadata,
                updatedAt: new Date(),
                updatedBy: userId
            }
        });
    }
}