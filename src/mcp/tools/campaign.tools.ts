import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CampaignService } from "../../services/campaign.service.js";

export function registerCampaignTools(server: McpServer) {
  const campaignService = new CampaignService();

  // Create campaign
  server.tool(
    "createCampaign",
    "Create a new campaign to organize and group related content plans and pieces.",
    {
      name: z.string(),
      description: z.string(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      objectives: z.array(z.string()).optional(),
    },
    async (params) => {
      const result = await campaignService.createCampaign({
        name: params.name,
        description: params.description,
        startDate: new Date(params.startDate),
        endDate: new Date(params.endDate),
        objectives: params.objectives || [],
        status: "draft",
      });

      return {
        content: [
          {
            type: "text",
            text: `Campaign created: ${params.name} (ID: ${result._id})`,
          },
        ],
        campaign_id: result._id,
        name: result.name,
        status: result.status,
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
            text: `Campaign details: ${campaign.name} (ID: ${campaign._id})`,
          },
        ],
        campaign,
      };
    }
  );

  // List all campaigns
  server.tool(
    "listCampaigns",
    "List all campaigns in the system.",
    {},
    async () => {
      const campaigns = await campaignService.getAllCampaigns();
      return {
        content: [
          {
            type: "text",
            text: `Retrieved ${campaigns.length} campaigns`,
          },
        ],
        campaigns,
      };
    }
  );

  // Update campaign
  server.tool(
    "updateCampaign",
    "Update an existing campaign's details.",
    {
      campaign_id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      objectives: z.array(z.string()).optional(),
      status: z.enum(["draft", "active", "completed", "archived"]).optional(),
    },
    async (params) => {
      const updates: any = {};
      if (params.name) updates.name = params.name;
      if (params.description) updates.description = params.description;
      if (params.startDate) updates.startDate = new Date(params.startDate);
      if (params.endDate) updates.endDate = new Date(params.endDate);
      if (params.objectives) updates.objectives = params.objectives;
      if (params.status) updates.status = params.status;

      const result = await campaignService.updateCampaign(
        params.campaign_id,
        updates
      );
      if (!result) {
        throw new Error(`Campaign with ID ${params.campaign_id} not found`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Campaign updated: ${result.name} (ID: ${result._id})`,
          },
        ],
        campaign: result,
      };
    }
  );
}
