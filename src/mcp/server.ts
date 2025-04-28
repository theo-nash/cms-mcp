import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerContentTools } from "./tools/content.tools.js";
import { registerTwitterTools } from "./tools/twitter.tools.js";
import { registerBrandTools } from "./tools/brand.tools.js";
import { registerPlanTools } from "./tools/plan.tools.js";
import { registerCampaignTools } from "./tools/campaign.tools.js";

export async function setupMcpServer() {
  // Create MCP server
  const server = new McpServer({
    name: "CMS-MCP-Server",
    version: "1.0.0",
  });

  // Register tools
  registerBrandTools(server);
  registerPlanTools(server);
  registerContentTools(server);
  registerTwitterTools(server);
  registerCampaignTools(server);

  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log("MCP server started with Stdio transport");

  return server;
}
