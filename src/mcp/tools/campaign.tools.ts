import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";
import { CampaignService } from "../../services/campaign.service.js";
import { formatDate, getDurationInDays } from "../../utils/date.utils.js";
import { CampaignCreationSchema, CampaignCreationSchemaParser, CampaignUpdateSchema } from "../../models/campaign.model.js";
import { McpSchemaBuilder } from "../../utils/mcp-schema.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";

export function registerCampaignTools(server: McpServer) {
  const campaignService = new CampaignService();

  const campaignDateFields = z.object({
    startDate: z.coerce.date().describe("Start date of the campaign (ISO 8601 format)"),
    endDate: z.coerce.date().describe("End date of the campaign (ISO 8601 format)"),
    majorMilestones: z.array(z.object({
      date: z.coerce.date().describe("Target date for this milestone (optional)  Format: ISO 8601"),
      description: z.string().describe("Description of what this milestone represents"),
      status: z.enum(["pending", "completed"]).default("pending")
        .describe("Current status of this milestone")
    })).default([]).describe("Major campaign milestones with dates and completion status"),
  });

  // Create campaign
  server.tool(
    "createCampaign",
    "Creates a new marketing campaign that serves as the top-level organizing unit for content plans and content pieces. A campaign represents a cohesive marketing initiative with specific objectives, timeline, and target audiences. Master plans and their associated micro plans are organized under campaigns. Required parameters: brandId or brandName, name, description, startDate, and endDate. Optional: objectives (array of campaign goals). A campaign starts in 'draft' state and can be transitioned to 'active', 'completed', and 'archived' states throughout its lifecycle.",
    CampaignCreationSchema.merge(campaignDateFields).shape,
    async (params) => {
      const campaignData = CampaignCreationSchemaParser.parse(params);

      // Check for either brandId or brandName
      if (!campaignData.brandId && !campaignData.brandName) {
        throw new Error("Either brandId or brandName must be provided");
      }

      const result = await campaignService.createCampaign(campaignData);

      const durationDays = getDurationInDays(result.startDate, result.endDate);

      return {
        content: [
          {
            type: "text",
            text: `Campaign "${params.name}" successfully created with ID: ${result._id}`
          },
          {
            type: "text",
            text: `The campaign runs from ${formatDate(result.startDate)} to ${formatDate(result.endDate)} (${durationDays} days) and is in "${result.status}" state.`
          },
          {
            type: "text",
            text: `Next steps: 1) Use createMasterPlan to create content strategies for this campaign, 2) Create micro plans under those master plans, and 3) Create and schedule content.`
          }
        ],
        campaign_id: result._id,
        name: result.name,
        description: result.description,
        status: result.status,
        date_range: {
          start: result.startDate.toISOString(),
          end: result.endDate.toISOString()
        },
        duration_days: durationDays,
        objectives: result.objectives || [],
        brand_id: result.brandId,
        created_at: result.created_at.toISOString(),
        created_by: result.stateMetadata?.updatedBy || "system-user"
      };
    }
  );

  // Get campaign
  server.tool(
    "getCampaign",
    "Retrieve details for a specific campaign by its ID.",
    {
      campaign_id: z.string(),
    },
    async (params) => {
      const campaign = await campaignService.getCampaignById(
        params.campaign_id
      );
      if (!campaign) {
        throw new Error(`Campaign with ID ${params.campaign_id} not found`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(campaign)
          },
        ],
        campaign,
      };
    }
  );

  // List all campaigns
  server.tool(
    "listCampaigns",
    "List all campaigns in the system. Choose between all active campaigns or all campaigns.",
    {
      activeOnly: z.boolean().default(false).describe("Whether to list only active campaigns or all campaigns.")
    },
    async (params) => {
      const campaigns = await campaignService.getAllCampaigns(params.activeOnly);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(campaigns)
          },
        ],
        campaigns,
      };
    }
  );

  // Update campaign
  server.tool(
    "updateCampaign",
    "Update an existing campaign's details. Use this to change the campaign name, description, start date, end date, objectives, status, goals, audience, content mix, or major milestones.",
    CampaignUpdateSchema.merge(campaignDateFields.partial()).shape,
    async (params) => {
      const updateData = CampaignUpdateSchema.parse(params);

      const result = await campaignService.updateCampaign(updateData);

      if (!result) {
        throw new Error(`Campaign with ID ${params.campaign_id} not found`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Campaign "${result.name}" (ID: ${result._id}) updated successfully`
          },
        ],
        campaign: result,
      };
    }
  );

  server.tool(
    "updateCampaignMilestone",
    "Update the status of a specific milestone in a campaign.",
    {
      campaign_id: z.string(),
      milestone_index: z.number().int().min(0),
      status: z.enum(['pending', 'completed']),
      user_id: z.string().default("system")
    },
    async (params) => {
      const result = await campaignService.updateMilestoneStatus(
        params.campaign_id,
        params.milestone_index,
        params.status,
        params.user_id
      );

      if (!result) {
        throw new Error(`Campaign with ID ${params.campaign_id} not found or milestone index is invalid`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Milestone ${params.milestone_index} updated to status: ${params.status}`
          }
        ],
        campaign_id: result._id,
        milestone_description: result.majorMilestones?.[params.milestone_index]?.description || "Unknown milestone",
        status: params.status
      };
    }
  );
}
