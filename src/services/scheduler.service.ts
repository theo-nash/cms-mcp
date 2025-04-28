import { ContentRepository } from "../repositories/content.repository.js";
import { BrandRepository } from "../repositories/brand.repository.js";
import { PlanRepository } from "../repositories/plan.repository.js";
import { CampaignRepository } from "../repositories/campaign.repository.js";
import { TwitterService } from "./twitter.service.js";
import { ContentState } from "../models/content.model.js";
import { PlanType } from "../models/plan.model.js";

export class SchedulerService {
    private contentRepository: ContentRepository;
    private brandRepository: BrandRepository;
    private planRepository: PlanRepository;
    private campaignRepository: CampaignRepository;
    private twitterService: TwitterService;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.contentRepository = new ContentRepository();
        this.brandRepository = new BrandRepository();
        this.planRepository = new PlanRepository();
        this.campaignRepository = new CampaignRepository();
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
                        throw new Error("Content id missing.");
                    }

                    // Skip content that's not in Ready state
                    if (content.state !== ContentState.Ready) {
                        console.log(`Content ${content._id} is scheduled but not in Ready state. Skipping.`);
                        continue;
                    }


                    // Get the micro plan
                    const microPlan = await this.planRepository.findById(content.microPlanId);
                    if (!microPlan || microPlan.type !== PlanType.Micro) {
                        console.error(`Micro plan not found for content ${content._id}`);
                        continue;
                    }

                    // Get the master plan
                    const masterPlan = await this.planRepository.findById(microPlan.masterPlanId);
                    if (!masterPlan || masterPlan.type !== PlanType.Master) {
                        console.error(`Master plan not found for micro plan ${microPlan._id}`);
                        continue;
                    }

                    // Get the campaign
                    const campaign = await this.campaignRepository.findById(masterPlan.campaignId);
                    if (!campaign) {
                        console.error(`Campaign not found for master plan ${masterPlan._id}`);
                        continue;
                    }

                    // Get brand for publishing
                    const brand = await this.brandRepository.findById(campaign.brandId);
                    if (!brand) {
                        console.error(`Brand not found for campaign ${campaign._id}`);
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