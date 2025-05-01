import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlanService } from "../../services/plan.service.js";
import { PlanState, PlanType, Plan, MasterPlan, MicroPlan, MasterPlanCreationSchema, MasterPlanCreationSchemaParser, MicroPlanCreationSchema, MicroPlanCreationSchemaParser, MasterPlanUpdateSchema, MasterPlanUpdateSchemaParser, MicroPlanUpdateSchema, MicroPlanUpdateSchemaParser } from "../../models/plan.model.js";
import { CampaignService } from "../../services/campaign.service.js";
import { ensureDate, getDurationInDays } from "../../utils/date.utils.js";

export function registerPlanTools(server: McpServer) {
    const planService = new PlanService();
    const campaignService = new CampaignService();

    // Plan date fields
    const planDateFields = z.object({
        dateRange: z.object({
            start: z.coerce.date().describe("When the plan begins"),
            end: z.coerce.date().describe("When the plan ends")
        }).describe("Date range for the plan's execution"),
    });

    const masterPlanDateFields = planDateFields.extend({
        timeline: z.array(z.object({
            date: z.coerce.date().describe("Date for this timeline event"),
            description: z.string().describe("Description of the timeline event"),
            type: z.string().describe("Type of event (e.g., launch, release, review)"),
            status: z.enum(["pending", "in-progress", "completed"]).default("pending")
                .describe("Current status of this timeline event")
        })).optional().describe("Detailed timeline of plan execution")
    });
    // Create master plan
    server.tool(
        "createMasterPlan",
        "Creates a master plan for a campaign that serves as the high-level content strategy. Master plans organize content objectives, define target audiences, specify distribution channels, and establish timelines. Multiple micro plans can be created under a master plan.Either campaignName or campaignId must be provided.",
        MasterPlanCreationSchema.merge(masterPlanDateFields).shape,
        async (params) => {
            const planData = MasterPlanCreationSchemaParser.parse(params);

            const result = await planService.createMasterPlan(planData);

            const campaign = await campaignService.getCampaignById(result.campaignId);

            const durationDays = getDurationInDays(result.dateRange.start, result.dateRange.end);

            return {
                content: [
                    {
                        type: "text",
                        text: `Master plan "${params.title}" successfully created with ID: ${result._id}`
                    },
                    {
                        type: "text",
                        text: `This master plan is part of the "${campaign?.name}" campaign and will run for ${durationDays} days (${result.dateRange.start.toLocaleDateString()} to ${result.dateRange.end.toLocaleDateString()}).`
                    },
                    {
                        type: "text",
                        text: `Next steps: Create micro plans under this master plan using the createMicroPlan tool, then create content for those micro plans.`
                    }
                ],
                plan_id: result._id,
                title: result.title,
                type: result.type,
                state: result.state,
                campaignId: campaign?._id,
                campaign_name: campaign?.name,
                date_range: {
                    start: ensureDate(result.dateRange.start, 'date_range.start'),
                    end: ensureDate(result.dateRange.end, 'date_range.end'),
                },
                goals: result.goals,
                target_audience: result.targetAudience,
                channels: result.channels,
                isActive: result.isActive
            };
        }
    );

    // Create micro plan
    server.tool(
        "createMicroPlan",
        "Create a new micro plan under a master plan. Use this to define specific content pieces or initiatives that support the master plan's goals.  Either masterPlanId or masterPlanName must be provided.",
        MicroPlanCreationSchema.merge(planDateFields).shape,
        async (params) => {
            const planData = MicroPlanCreationSchemaParser.parse(params);

            const result = await planService.createMicroPlan(planData);
            const masterPlan = await planService.getMasterPlanById(result.masterPlanId);
            const durationDays = getDurationInDays(result.dateRange.start, result.dateRange.end);

            return {
                content: [
                    {
                        type: "text",
                        text: `Micro plan created: ${params.title} (ID: ${result._id})`
                    },
                    {
                        type: "text",
                        text: `This micro plan is part of the "${masterPlan?.title}" master plan and will run for ${durationDays} days (${result.dateRange.start.toLocaleDateString()} to ${result.dateRange.end.toLocaleDateString()}).`
                    },
                    {
                        type: "text",
                        text: `Next steps: Create content for this micro plan using the createContent tool. Approve this micro plan using the approvePlan tool (ensure user has approved). Activate this micro plan using the activatePlan tool.`
                    }
                ],
                plan_id: result._id,
                title: result.title,
                state: result.state,
                master_plan_id: result.masterPlanId,
                isActive: result.isActive
            };
        }
    );

    // Get plan
    server.tool(
        "getPlan",
        "Retrieve details for a specific content plan by its ID or name. Use this to view the plan's objectives, schedule, channels, and current state.  Either plan_id or plan_name must be provided.",
        {
            plan_id: z.string().optional(),
            plan_name: z.string().optional(),
            type: z.enum(["master", "micro"]).optional()
        },
        async (params) => {
            let plan;
            if (params.plan_id) {
                plan = await planService.getPlan(params.plan_id);
            } else if (params.plan_name) {
                if (params.type === "master") {
                    plan = await planService.getMasterPlanByName(params.plan_name);
                } else if (params.type === "micro") {
                    plan = await planService.getMicroPlanByName(params.plan_name);
                }
            }

            if (!plan) {
                throw new Error(`Plan with ID ${params.plan_id} not found`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(plan)
                    }
                ],
                plan_id: plan._id,
                title: plan.title,
                type: plan.type,
                date_range: {
                    start: ensureDate(plan.dateRange.start, 'date_range.start'),
                    end: ensureDate(plan.dateRange.end, 'date_range.end')
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
        "List all content plans associated with a specific brand. Use this to see all master or micro plans for a brand.  Either brand_id or brand_name must be provided.",
        {
            brand_id: z.string().optional(),
            brand_name: z.string().optional()
        },
        async (params) => {
            let plans;
            if (params.brand_id) {
                plans = await planService.getPlansByBrandId(params.brand_id);
            } else if (params.brand_name) {
                plans = await planService.getPlansByBrandName(params.brand_name);
            }

            if (!plans) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No plans found for brand ID ${params.brand_id} or brand name ${params.brand_name}`
                        }
                    ]
                }
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(plans)
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
        "updateMasterPlan",
        "Update the details of an existing master plan. Use this to modify the plan's title, schedule, goals, target audience, channels, timeline, content strategy, state, and isActive.  Either plan_id or plan_name must be provided.",
        MasterPlanUpdateSchema.merge(masterPlanDateFields.partial()).shape,
        async (params) => {
            const updateData = MasterPlanUpdateSchemaParser.parse(params);

            // Update the plan
            const result = await planService.updatePlan(updateData);

            return {
                content: [
                    {
                        type: "text",
                        text: `Plan updated: ${result?.title} (ID: ${result?._id})`
                    },
                    {
                        type: "text",
                        text: `Updated data: ${JSON.stringify(result)}`
                    }
                ],
                updatedData: result
            };
        }
    );

    server.tool(
        "updateMicroPlan",
        "Update the details of an existing micro plan. Use this to modify the plan's title, schedule, goals, target audience, channels, timeline, content series, and performance metrics, state, and isActive.  Either plan_id or plan_name must be provided.",
        MicroPlanUpdateSchema.merge(planDateFields.partial()).shape,
        async (params) => {
            const updateData = MicroPlanUpdateSchemaParser.parse(params);

            // Update the plan
            const result = await planService.updatePlan(updateData);

            return {
                content: [
                    {
                        type: "text",
                        text: `Plan updated: ${result?.title} (ID: ${result?._id})`
                    },
                    {
                        type: "text",
                        text: `Updated data: ${JSON.stringify(result)}`
                    }
                ],
                updatedData: result
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
        "getMicroPlansByMaster",
        "Get all micro plans associated with a master plan.",
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

            const microPlans = await planService.getMicroPlansByMasterId(masterPlanId);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(microPlans)
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
        "getMasterPlansByCampaign",
        "Get all master plans associated with a campaign.",
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

            const masterPlans = await planService.getMasterPlansByCampaignId(campaignId);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(masterPlans)
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