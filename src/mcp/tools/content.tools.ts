import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContentService } from "../../services/content.service.js";
import { ContentState } from "../../models/content.model.js";
import { BrandService } from "../../services/brand.service.js";

export function registerContentTools(server: McpServer) {
    const contentService = new ContentService();
    const brandService = new BrandService();

    // Create content
    server.tool(
        "createContent",
        "Create a new content item. Can be associated with either a micro plan or directly with a brand.",
        {
            micro_plan_id: z.string().optional(),
            brandName: z.string().optional(),
            title: z.string(),
            content: z.string(),
            user_id: z.string()
        },
        async (params) => {
            // Validate that either micro_plan_id or brand_id is provided
            if (!params.micro_plan_id && !params.brandName) {
                throw new Error("Either micro_plan_id or brandName must be provided");
            }

            let brandId: string | undefined = undefined;

            if (params.brandName) {
                const brand = await brandService.getBrandByName(params.brandName || "");
                if (!brand) {
                    throw new Error(`Brand with name ${params.brandName} not found`);
                }
                brandId = brand._id!;
            }

            const result = await contentService.createContent({
                microPlanId: params.micro_plan_id,
                brandId: brandId,
                title: params.title,
                content: params.content,
                userId: params.user_id
            });

            return {
                content: [
                    {
                        type: "text",
                        text: `Content created: ${params.title} (ID: ${result._id})`
                    }
                ],
                content_id: result._id,
                title: result.title,
                state: result.state
            };
        }
    );

    // Schedule content
    server.tool(
        "scheduleContent",
        "Schedule a content item for publication at a specific date and time.",
        {
            content_id: z.string(),
            publish_at: z.string().datetime(),
            user_id: z.string()
        },
        async (params) => {
            const publishAt = new Date(params.publish_at);

            const result = await contentService.scheduleContent(
                params.content_id,
                publishAt,
                params.user_id
            );

            if (!result) {
                throw new Error(`Content with ID ${params.content_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Content scheduled for publication: ${result.title} (ID: ${params.content_id})`
                    }
                ],
                content_id: result._id,
                title: result.title,
                scheduled_for: publishAt.toISOString()
            };
        }
    );

    // Approve content
    server.tool(
        "approveContent",
        "Approve a content item for publication. Use this to mark content as ready after review, optionally including reviewer comments.",
        {
            content_id: z.string(),
            user_id: z.string(),
            comments: z.string().optional()
        },
        async (params) => {
            const result = await contentService.transitionContentState(
                params.content_id,
                ContentState.Ready,
                {
                    userId: params.user_id,
                    comments: params.comments
                }
            );

            if (!result) {
                throw new Error(`Content with ID ${params.content_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Content approved: ${result.title} (ID: ${params.content_id})`
                    }
                ],
                content_id: result._id,
                title: result.title,
                state: result.state
            };
        }
    );

    // Get content by master plan ID
    server.tool(
        "getContentByMasterPlanId",
        "Get all content associated with a master plan by retrieving content from all its micro plans.",
        {
            master_plan_id: z.string()
        },
        async (params) => {
            const content = await contentService.getContentByMasterPlanId(params.master_plan_id);

            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${content.length} content items for master plan ${params.master_plan_id}`
                    }
                ],
                content_items: content
            };
        }
    );

    // Get content by campaign ID
    server.tool(
        "getContentByCampaignId",
        "Get all content associated with a campaign by retrieving content from all its master plans.",
        {
            campaign_id: z.string()
        },
        async (params) => {
            const content = await contentService.getContentByCampaignId(params.campaign_id);

            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${content.length} content items for campaign ${params.campaign_id}`
                    }
                ],
                content_items: content
            };
        }
    );
}