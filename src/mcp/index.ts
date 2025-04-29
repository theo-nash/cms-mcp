import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setupMcpServer } from "./server.js";
import { connectToDatabase } from "../config/db.js";
let server: McpServer;

async function main() {
    // Start the MCP server
    server = await setupMcpServer();

    // Set up the database connection
    await connectToDatabase();

    // Set up graceful shutdown handlers
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);

    console.error('MCP server started successfully');
}

async function handleShutdown() {
    console.error('Shutting down Twitter MCP server...');

    if (server) {
        try {
            await server.close();
            console.error('MCP server closed successfully');
        } catch (err) {
            console.error('Error while closing MCP server:', err);
        }
    }

    process.exit(0);
}

// Run the main function
main().catch(err => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
});

