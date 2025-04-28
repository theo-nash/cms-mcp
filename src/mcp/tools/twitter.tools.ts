import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TwitterService } from "../../services/twitter.service.js";
import { BrandService } from "../../services/brand.service.js";
import { ContentService } from "../../services/content.service.js";
import { ContentState } from "../../models/content.model.js";

export function registerTwitterTools(server: McpServer) {
    const twitterService = new TwitterService();
    const brandService = new BrandService();
    const contentService = new ContentService();

    // Publish content to Twitter
    server.tool(
        "publishToTwitter",
        "Publish a content item directly to Twitter for a specific brand. Use this to post approved content as a tweet, automatically updating the content's status and storing the tweet URL and ID.",
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

            // Get the brand
            const brand = await brandService.getBrand(content.brandId);
            if (!brand) {
                throw new Error(`Brand with ID ${content.brandId} not found`);
            }

            // Publish to Twitter
            const result = await twitterService.publishContent(content, brand);

            // Update content status
            const now = new Date();

            // Update published metadata
            await contentService.updateContent(
                content._id || "",
                {
                    state: ContentState.Published,
                    stateMetadata: {
                        ...content.stateMetadata,
                        publishedAt: now,
                        publishedUrl: result.url
                    }
                },
                params.user_id
            );

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
                published_at: now.toISOString()
            };
        }
    );
}