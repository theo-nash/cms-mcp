import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TwitterService } from "../../services/twitter.service.js";
import { BrandService } from "../../services/brand.service.js";
import { ContentService } from "../../services/content.service.js";
import { PlanService } from "../../services/plan.service.js";
import { CampaignService } from "../../services/campaign.service.js";
import { ContentState } from "../../models/content.model.js";
import { PlanType } from "../../models/plan.model.js";

export function registerTwitterTools(server: McpServer) {
    const twitterService = new TwitterService();
    const brandService = new BrandService();
    const contentService = new ContentService();
    const planService = new PlanService();
    const campaignService = new CampaignService();

    // Publish content to Twitter
    server.tool(
        "publishToTwitter",
        "Publish a content item directly to Twitter. Use this to post approved content as a tweet, automatically updating the content's status and storing the tweet URL and ID.",
        {
            content_id: z.string(),
            user_id: z.string()
        },
        async (params) => {
            // Get the content
            const content = await contentService.getContent(params.content_id);
            if (!content) {
                throw new Error(`Content with ID ${params.content_id} not found`);
            }

            // Verify content is in Ready state
            if (content.state !== ContentState.Ready) {
                throw new Error(`Content must be in 'ready' state to be published`);
            }

            // Get the micro plan
            const microPlan = await planService.getPlan(content.microPlanId);
            if (!microPlan || microPlan.type !== PlanType.Micro) {
                throw new Error(`Micro plan with ID ${content.microPlanId} not found`);
            }

            // Get the master plan
            const masterPlan = await planService.getPlan(microPlan.masterPlanId);
            if (!masterPlan || masterPlan.type !== PlanType.Master) {
                throw new Error(`Master plan with ID ${microPlan.masterPlanId} not found`);
            }

            // Get the campaign
            const campaign = await campaignService.getCampaignById(masterPlan.campaignId);
            if (!campaign) {
                throw new Error(`Campaign with ID ${masterPlan.campaignId} not found`);
            }

            // Get the brand
            const brand = await brandService.getBrand(campaign.brandId);
            if (!brand) {
                throw new Error(`Brand with ID ${campaign.brandId} not found`);
            }

            // Publish to Twitter
            const result = await twitterService.publishContent(content, brand);

            // Update content state and metadata
            const updatedContent = await contentService.transitionContentState(
                content._id!,
                ContentState.Published,
                {
                    userId: params.user_id,
                    comments: `Published to Twitter: ${result.url}`
                }
            );

            if (!updatedContent) {
                throw new Error(`Failed to update content state after publishing`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Content published to Twitter: ${result.url}`
                    }
                ],
                content_id: content._id,
                tweet_id: result.id,
                tweet_url: result.url,
                published_at: updatedContent.stateMetadata.updatedAt.toISOString()
            };
        }
    );
}