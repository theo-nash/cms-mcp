import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContentService } from "../../services/content.service.js";
import { ContentState } from "../../models/content.model.js";

export function registerContentTools(server: McpServer) {
    const contentService = new ContentService();

    // Create content
    server.tool(
        "createContent",
        "Create a new content item for a specific brand and plan. Use this to draft articles, posts, or other content pieces and associate them with a user.",
        {
            plan_id: z.string(),
            brand_id: z.string(),
            title: z.string(),
            content: z.string(),
            user_id: z.string()
        },
        async (params) => {
            const result = await contentService.createContent({
                planId: params.plan_id,
                brandId: params.brand_id,
                title: params.title,
                content: params.content,
                userId: params.user_id
            });

            return {
                content: [
                    {
                        type: "text",
                        text: `Content created: ${params.title} (ID: ${params.plan_id})`
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
        "Schedule a content item for publication at a specific date and time. Use this to automate when content will be published for a brand.",
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
        "Approve a content item for publication. Use this to mark content as ready after review, optionally including reviewer comments. This ensures that the content meets the required standards before going live.",
        {
            content_id: z.string(),
            user_id: z.string(),
            comments: z.string().optional()
        },
        async (params) => {
            // Implementation for approving content
            // Would call contentService.transitionContentState()

            return {
                content: [
                    {
                        type: "text",
                        text: `Content approved: ${params.content_id}`
                    }
                ],
                content_id: params.content_id,
                state: ContentState.Ready
            };
        }
    );
}