import { Content, ContentState } from "../models/content.model.js";
import { ContentRepository } from "../repositories/content.repository.js";
import { BrandRepository } from "../repositories/brand.repository.js";

export interface ContentCreationData {
    planId: string;
    brandId: string;
    title: string;
    content: string;
    userId: string;
}

export interface StateTransitionMetadata {
    userId: string;
    comments?: string;
}

export class ContentService {
    private contentRepository: ContentRepository;
    private brandRepository: BrandRepository;

    constructor() {
        this.contentRepository = new ContentRepository();
        this.brandRepository = new BrandRepository();
    }

    /**
     * Get all content
     */
    async getAllContent(): Promise<Content[]> {
        return await this.contentRepository.find({});
    }

    /**
     * Get content by plan ID
     */
    async getContentByPlanId(planId: string): Promise<Content[]> {
        return await this.contentRepository.findByPlanId(planId);
    }

    /**
     * Get content by brand ID
     */
    async getContentByBrandId(brandId: string): Promise<Content[]> {
        return await this.contentRepository.findByBrandId(brandId);
    }

    /**
     * Create new content
     */
    async createContent(data: ContentCreationData): Promise<Content> {
        // Create state metadata
        const stateMetadata = {
            updatedAt: new Date(),
            updatedBy: data.userId,
            comments: ""
        };

        // Create the content with initial state
        return await this.contentRepository.create({
            planId: data.planId,
            brandId: data.brandId,
            title: data.title,
            content: data.content,
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
    async updateContent(contentId: string, updates: any, userId: string): Promise<Content | null> {
        // Get current content
        const content = await this.contentRepository.findById(contentId);
        if (!content) return null;

        // Only allow updates if content is in Draft state
        if (content.state !== ContentState.Draft) {
            throw new Error("Can only update content in Draft state");
        }

        // Update state metadata
        const stateMetadata = {
            ...content.stateMetadata,
            updatedAt: new Date(),
            updatedBy: userId
        };

        // Apply updates
        return await this.contentRepository.update(contentId, {
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

        // Apply the state change
        return await this.contentRepository.update(contentId, {
            state: targetState,
            stateMetadata
        });
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
        // Get brand guidelines
        const brand = await this.brandRepository.findById(content.brandId);
        if (!brand || !brand.guidelines) {
            // No guidelines to validate against
            return;
        }

        const guidelines = brand.guidelines;
        const contentText = content.content.toLowerCase();

        // Check for avoided terms
        const foundAvoidedTerms = guidelines.avoidedTerms.filter(term =>
            contentText.includes(term.toLowerCase())
        );

        if (foundAvoidedTerms.length > 0) {
            throw new Error(`Content contains avoided terms: ${foundAvoidedTerms.join(', ')}`);
        }

        // Additional validation can be added here
        // For MVP, we'll keep it simple
    }
}