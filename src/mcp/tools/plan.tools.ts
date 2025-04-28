import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlanService } from "../../services/plan.service.js";
import { PlanState, PlanType } from "../../models/plan.model.js";

export function registerPlanTools(server: McpServer) {
    const planService = new PlanService();

    // Create master plan
    server.tool(
        "createMasterPlan",
        "Create a new master plan for a campaign. Use this to define a high-level content strategy, including its goals, target audience, channels, and schedule.",
        {
            campaign_id: z.string(),
            title: z.string(),
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
            const result = await planService.createMasterPlan({
                campaignId: params.campaign_id,
                title: params.title,
                dateRange: {
                    start: new Date(params.date_range.start),
                    end: new Date(params.date_range.end)
                },
                goals: params.goals,
                targetAudience: params.target_audience,
                channels: params.channels,
                userId: params.user_id
            });

            return {
                content: [
                    {
                        type: "text",
                        text: `Master plan created: ${params.title} (ID: ${result._id})`
                    }
                ],
                plan_id: result._id,
                title: result.title,
                state: result.state
            };
        }
    );

    // Create micro plan
    server.tool(
        "createMicroPlan",
        "Create a new micro plan under a master plan. Use this to define specific content pieces or initiatives that support the master plan's goals.",
        {
            master_plan_id: z.string(),
            title: z.string(),
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
            const result = await planService.createMicroPlan({
                masterPlanId: params.master_plan_id,
                title: params.title,
                dateRange: {
                    start: new Date(params.date_range.start),
                    end: new Date(params.date_range.end)
                },
                goals: params.goals,
                targetAudience: params.target_audience,
                channels: params.channels,
                userId: params.user_id
            });

            return {
                content: [
                    {
                        type: "text",
                        text: `Micro plan created: ${params.title} (ID: ${result._id})`
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
                title: plan.title,
                type: plan.type,
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
                state: result.state
            };
        }
    );

    // Get micro plans by master plan ID
    server.tool(
        "getMicroPlansByMasterId",
        "Get all micro plans associated with a master plan.",
        {
            master_plan_id: z.string()
        },
        async (params) => {
            const microPlans = await planService.getMicroPlansByMasterId(params.master_plan_id);

            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${microPlans.length} micro plans for master plan ${params.master_plan_id}`
                    }
                ],
                micro_plans: microPlans.map(plan => ({
                    plan_id: plan._id,
                    title: plan.title,
                    state: plan.state,
                    is_active: plan.isActive
                }))
            };
        }
    );

    // Get master plans by campaign ID
    server.tool(
        "getMasterPlansByCampaignId",
        "Get all master plans associated with a campaign.",
        {
            campaign_id: z.string()
        },
        async (params) => {
            const masterPlans = await planService.getMasterPlansByCampaignId(params.campaign_id);

            return {
                content: [
                    {
                        type: "text",
                        text: `Found ${masterPlans.length} master plans for campaign ${params.campaign_id}`
                    }
                ],
                master_plans: masterPlans.map(plan => ({
                    plan_id: plan._id,
                    title: plan.title,
                    state: plan.state,
                    is_active: plan.isActive
                }))
            };
        }
    );
}