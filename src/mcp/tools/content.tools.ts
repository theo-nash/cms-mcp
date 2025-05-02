import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContentService } from "../../services/content.service.js";
import { ContentCreationSchema, ContentCreationSchemaParser, ContentState, ContentUpdateSchema } from "../../models/content.model.js";
import { BrandService } from "../../services/brand.service.js";
import { PlanService } from "../../services/plan.service.js";
import { CampaignService } from "../../services/campaign.service.js";
import { ensureDate } from "../../utils/date.utils.js";

export function registerContentTools(server: McpServer) {
    const contentService = new ContentService();
    const brandService = new BrandService();
    const planService = new PlanService();
    const campaignService = new CampaignService();

    const contentDateFields = z.object({
        scheduledFor: z.coerce.date().describe("When the content is scheduled to be published (optional)  Format: ISO 8601"),
    });

    // Create content
    server.tool(
        "createContent",
        "Creates a new content item that can be scheduled and published to social media. Content must be associated with either a micro plan (recommended for campaign-driven content) or directly with a brand (for standalone content). The content starts in 'draft' state and can be transitioned to 'ready' and then 'published' states. Required parameters: title, content text. You must also provide either microPlanId or brandName (or brandId) to establish the content's association. Optional parameters: format, platform, mediaRequirements, targetAudience, keywords, scheduledFor.",
        ContentCreationSchema.merge(contentDateFields).shape,
        async (params) => {
            const contentData = ContentCreationSchemaParser.parse(params);

            // Validate that either microPlanId or brand_id is provided
            if (!contentData.microPlanId && !contentData.brandName) {
                throw new Error("Either microPlanId or brandName must be provided");
            }

            const result = await contentService.createContent(contentData);

            return {
                content: [
                    {
                        type: "text",
                        text: `Content "${params.title}" successfully created with ID: ${result._id}`
                    },
                    {
                        type: "text",
                        text: `The content is in "${result.state}" state and is associated with ${result.microPlanId ? 'micro plan ID: ' + result.microPlanId : 'brand ID: ' + result.brandId}. To make it ready for publication, use the approveContent tool. To schedule it for publication, use the scheduleContent tool. To make changes to the content, use the updateContent tool.`
                    }
                ],
                content_id: result._id,
                title: result.title,
                content_text: result.content.substring(0, 100) + (result.content.length > 100 ? '...' : ''),
                state: result.state,
                association_type: result.microPlanId ? 'micro_plan' : 'brand',
                association_id: result.microPlanId || result.brandId,
                created_at: result.created_at.toISOString(),
                created_by: result.stateMetadata.updatedBy,
                word_count: result.content.split(/\s+/).length,
                character_count: result.content.length
            };
        }
    );

    // Update content
    server.tool(
        "updateContent",
        "Updates an existing content item. You can update the content text, format, platform, media requirements, target audience, keywords, scheduled for, or comments. Only updates to the content text are allowed if the content is in 'draft' state.",
        ContentUpdateSchema.merge(contentDateFields.partial()).shape,
        async (params) => {
            const contentData = ContentUpdateSchema.parse(params);

            const result = await contentService.updateContent(contentData);

            if (!result) {
                throw new Error(`Problem updating content. Please try again.`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Content "${result.title}" successfully updated  ${params.create_new_version ? ` Version ID: ${result._id}` : ''}`
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
            publish_at: z.coerce.date().describe("When the content is scheduled to be published (Format: ISO 8601)")
        },
        async (params) => {
            const publishAt = ensureDate(params.publish_at, 'publish_at');

            const result = await contentService.scheduleContent(
                params.content_id,
                publishAt,
                "system-user"
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
        "Approves a content item and transitions it from 'draft' to 'ready' state. Content must be in 'ready' state before it can be published or scheduled. This tool validates the content against brand guidelines to ensure it meets standards.\n\nExample: approveContent(content_id: \"507f1f77bcf86cd799439011\", user_id: \"user123\", comments: \"Approved after minor edits\")",
        {
            content_id: z.string().describe("ID of the content item to approve (required)"),
            user_id: z.string().describe("ID of the user approving the content (required)"),
            comments: z.string().optional().describe("Optional reviewer comments about the approval")
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
                        text: `Content "${result.title}" successfully approved and is now in 'ready' state`
                    },
                    {
                        type: "text",
                        text: `The content has been validated against brand guidelines and is ready for publication.`
                    },
                    {
                        type: "text",
                        text: `Next steps: Use scheduleContent to set a future publication date or publishToTwitter to publish immediately.`
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
        "getContentByMasterPlan",
        "Get all content associated with a master plan by retrieving content from all its micro plans.",
        {
            master_plan_id: z.string().optional(),
            master_plan_name: z.string().optional()

        },
        async (params) => {
            let masterPlanId: string | undefined = undefined;

            if (params.master_plan_id) {
                masterPlanId = params.master_plan_id;
            } else if (params.master_plan_name) {
                const masterPlan = await planService.getMasterPlanByName(params.master_plan_name);
                if (!masterPlan || !masterPlan._id) {
                    throw new Error(`Master plan with name ${params.master_plan_name} not found`);
                }
                masterPlanId = masterPlan._id;
            }

            if (!masterPlanId) {
                throw new Error("Either master_plan_id or master_plan_name must be provided");
            }

            const content = await contentService.getContentByMasterPlanId(masterPlanId);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(content)
                    }
                ],
                content_items: content
            };
        }
    );

    // Get content by campaign ID
    server.tool(
        "getContentByCampaign",
        "Get all content associated with a campaign by retrieving content from all its master plans.",
        {
            campaignId: z.string().optional(),
            campaign_name: z.string().optional()
        },
        async (params) => {
            let campaignId: string | undefined = undefined;

            if (params.campaignId) {
                campaignId = params.campaignId;
            } else if (params.campaign_name) {
                const campaign = await campaignService.getCampaignByName(params.campaign_name);
                if (!campaign || !campaign._id) {
                    throw new Error(`Campaign with name ${params.campaign_name} not found`);
                }
                campaignId = campaign._id;
            }

            if (!campaignId) {
                throw new Error("Either campaignId or campaign_name must be provided");
            }

            const content = await contentService.getContentByCampaignId(campaignId);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(content)
                    }
                ],
                content_items: content
            };
        }
    );

    // Get content by brand
    server.tool(
        "getContentByBrand",
        "Get all content associated with a brand by retrieving content from all its plans and campaigns.",
        {
            brand_id: z.string().optional(),
            brand_name: z.string().optional()
        },
        async (params) => {
            let brandId: string | undefined = undefined;

            if (params.brand_id) {
                brandId = params.brand_id;
            } else if (params.brand_name) {
                const brand = await brandService.getBrandByName(params.brand_name);
                if (!brand || !brand._id) {
                    throw new Error(`Brand with name ${params.brand_name} not found`);
                }
                brandId = brand._id;
            }

            if (!brandId) {
                throw new Error("Either brand_id or brand_name must be provided");
            }

            const content = await contentService.getContentByBrandId(brandId);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(content)
                    }
                ],
                content_items: content
            };
        }
    );
}
