import { ContentRepository } from "../repositories/content.repository.js";
import { BrandRepository } from "../repositories/brand.repository.js";
import { TwitterService } from "./twitter.service.js";
import { ContentState } from "../models/content.model.js";

export class SchedulerService {
    private contentRepository: ContentRepository;
    private brandRepository: BrandRepository;
    private twitterService: TwitterService;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.contentRepository = new ContentRepository();
        this.brandRepository = new BrandRepository();
        this.twitterService = new TwitterService();
    }

    /**
     * Start the scheduler
     */
    start(intervalMs: number = 60000): void {
        if (this.checkInterval) return;

        // Schedule first check
        this.checkScheduledContent();

        // Set up recurring checks
        this.checkInterval = setInterval(() => {
            this.checkScheduledContent();
        }, intervalMs);

        console.log(`Scheduler started, checking every ${intervalMs}ms`);
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log("Scheduler stopped");
        }
    }

    /**
     * Check for content that needs to be published
     */
    private async checkScheduledContent(): Promise<void> {
        try {
            const now = new Date();

            // Find scheduled content
            const scheduledContent = await this.contentRepository.findScheduledBefore(now);

            for (const content of scheduledContent) {
                try {
                    if (!content._id) {
                        throw new Error("Content id missing.")
                    }

                    // Get brand for publishing
                    const brand = await this.brandRepository.findById(content.brandId);
                    if (!brand) {
                        console.error(`Brand not found for content ${content._id}`);
                        continue;
                    }

                    // Publish to Twitter
                    const result = await this.twitterService.publishContent(content, brand);

                    // Update content status
                    content.state = ContentState.Published;
                    content.stateMetadata.publishedAt = now;
                    content.stateMetadata.publishedUrl = result.url;
                    await this.contentRepository.update(content._id, {
                        state: ContentState.Published,
                        stateMetadata: content.stateMetadata
                    });

                    console.log(`Published content ${content._id} to Twitter: ${result.url}`);
                } catch (error) {
                    console.error(`Failed to publish content ${content._id}:`, error);
                }
            }
        } catch (error) {
            console.error("Error checking scheduled content:", error);
        }
    }
}