import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlanService } from "../../services/plan.service.js";
import { PlanState, PlanType } from "../../models/plan.model.js";

export function registerPlanTools(server: McpServer) {
    const planService = new PlanService();

    // Create plan
    server.tool(
        "createPlan",
        "Create a new content plan for a brand. Use this to define a campaign or initiative, including its goals, target audience, channels, and schedule. Supports both master and micro plans, and can link to a parent plan.",
        {
            brand_id: z.string(),
            title: z.string(),
            type: z.enum(['master', 'micro']),
            parent_plan_id: z.string().optional(),
            date_range: z.object({
                start: z.string().datetime(),
                end: z.string().datetime()
            }),
            goals: z.array(z.string()),
            target_audience: z.string(),
            channels: z.array(z.string()),
            user_id: z.string()
        },
        async (params) => {
            // Transform params to match service interface
            const planData = {
                brandId: params.brand_id,
                title: params.title,
                type: params.type === 'master' ? PlanType.Master : PlanType.Micro,
                parentPlanId: params.parent_plan_id,
                dateRange: {
                    start: new Date(params.date_range.start),
                    end: new Date(params.date_range.end)
                },
                goals: params.goals,
                targetAudience: params.target_audience,
                channels: params.channels,
                userId: params.user_id
            };

            // Create the plan
            const result = await planService.createPlan(planData);

            return {
                content: [
                    {
                        type: "text",
                        text: `Plan created: ${params.title} (ID: ${result._id})`
                    }
                ],
                plan_id: result._id,
                title: result.title,
                state: result.state
            };
        }
    );

    // Get plan
    server.tool(
        "getPlan",
        "Retrieve details for a specific content plan by its ID. Use this to view the plan's objectives, schedule, channels, and current state.",
        {
            plan_id: z.string()
        },
        async (params) => {
            const plan = await planService.getPlan(params.plan_id);

            if (!plan) {
                throw new Error(`Plan with ID ${params.plan_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Plan details: ${plan.title} (ID: ${params.plan_id})`
                    }
                ],
                plan_id: plan._id,
                brand_id: plan.brandId,
                title: plan.title,
                type: plan.type,
                parent_plan_id: plan.parentPlanId,
                date_range: {
                    start: plan.dateRange.start.toISOString(),
                    end: plan.dateRange.end.toISOString()
                },
                goals: plan.goals,
                target_audience: plan.targetAudience,
                channels: plan.channels,
                state: plan.state,
                is_active: plan.isActive,
                version: plan.stateMetadata.version
            };
        }
    );

    // Get plans by brand
    server.tool(
        "getPlansByBrand",
        "List all content plans associated with a specific brand. Use this to see all campaigns or initiatives for a brand.",
        {
            brand_id: z.string()
        },
        async (params) => {
            const plans = await planService.getPlansByBrandId(params.brand_id);

            return {
                content: [
                    {
                        type: "text",
                        text: `Plans for brand ID ${params.brand_id} retrieved.`
                    }
                ],
                plans: plans.map(plan => ({
                    plan_id: plan._id,
                    title: plan.title,
                    type: plan.type,
                    state: plan.state,
                    is_active: plan.isActive
                }))
            };
        }
    );

    // Update plan
    server.tool(
        "updatePlan",
        "Update the details of an existing content plan. Use this to modify the plan's title, schedule, goals, target audience, or channels.",
        {
            plan_id: z.string(),
            title: z.string().optional(),
            date_range: z.object({
                start: z.string().datetime(),
                end: z.string().datetime()
            }).optional(),
            goals: z.array(z.string()).optional(),
            target_audience: z.string().optional(),
            channels: z.array(z.string()).optional(),
            user_id: z.string()
        },
        async (params) => {
            // Transform date range if provided
            const dateRange = params.date_range ? {
                start: new Date(params.date_range.start),
                end: new Date(params.date_range.end)
            } : undefined;

            // Build updates object
            const updates = {
                title: params.title,
                dateRange,
                goals: params.goals,
                targetAudience: params.target_audience,
                channels: params.channels
            };

            // Remove undefined fields
            (["title", "dateRange", "goals", "targetAudience", "channels"] as const).forEach(key => {
                if (updates[key] === undefined) {
                    delete updates[key];
                }
            });

            // Update the plan
            const result = await planService.updatePlan(
                params.plan_id,
                updates,
                params.user_id
            );

            if (!result) {
                throw new Error(`Plan with ID ${params.plan_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Plan updated: ${params.title || result.title} (ID: ${params.plan_id})`
                    }
                ],
                plan_id: result._id,
                title: result.title,
                state: result.state,
                updated: true
            };
        }
    );

    // Approve plan
    server.tool(
        "approvePlan",
        "Approve a content plan for execution. Use this to mark a plan as reviewed and ready, optionally including reviewer comments.",
        {
            plan_id: z.string(),
            user_id: z.string(),
            comments: z.string().optional()
        },
        async (params) => {
            const result = await planService.transitionPlanState(
                params.plan_id,
                PlanState.Approved,
                {
                    userId: params.user_id,
                    comments: params.comments
                }
            );

            if (!result) {
                throw new Error(`Plan with ID ${params.plan_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Plan approved: ${result.title} (ID: ${params.plan_id})`
                    }
                ],
                plan_id: result._id,
                title: result.title,
                state: result.state
            };
        }
    );

    // Activate plan
    server.tool(
        "activatePlan",
        "Activate a content plan, making it live and actionable. Use this to start executing the plan after approval, optionally including activation comments.",
        {
            plan_id: z.string(),
            user_id: z.string(),
            comments: z.string().optional()
        },
        async (params) => {
            const result = await planService.transitionPlanState(
                params.plan_id,
                PlanState.Active,
                {
                    userId: params.user_id,
                    comments: params.comments
                }
            );

            if (!result) {
                throw new Error(`Plan with ID ${params.plan_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Plan activated: ${result.title} (ID: ${params.plan_id})`
                    }
                ],
                plan_id: result._id,
                title: result.title,
                state: result.state,
                is_active: result.isActive,
                version: result.stateMetadata.version
            };
        }
    );
}