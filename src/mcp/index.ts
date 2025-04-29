import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setupMcpServer } from "./server.js";
import { connectToDatabase } from "../config/db.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Try to load from .env.mcp file first (for Claude Desktop)
const envPath = path.resolve(process.cwd(), '.env.mcp');
if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    // Fall back to regular .env
    dotenv.config();
}

// Set default environment variables if not provided
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://mongo:27017/cms-mcp";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

// For Twitter functionality
process.env.TWITTER_USERNAME = process.env.TWITTER_USERNAME || "";
process.env.TWITTER_PASSWORD = process.env.TWITTER_PASSWORD || "";
process.env.TWITTER_EMAIL = process.env.TWITTER_EMAIL || "";
process.env.TWITTER_COOKIES_AUTH_TOKEN = process.env.TWITTER_COOKIES_AUTH_TOKEN || "";
process.env.TWITTER_COOKIES_CT0 = process.env.TWITTER_COOKIES_CT0 || "";
process.env.TWITTER_COOKIES_GUEST_ID = process.env.TWITTER_COOKIES_GUEST_ID || "";
process.env.TWITTER_2FA_SECRET = process.env.TWITTER_2FA_SECRET || "";

let server: McpServer;

async function main() {
    console.log("MCP Server Environment:");
    console.log(`- MONGODB_URI: ${process.env.MONGODB_URI}`);
    console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`- Twitter credentials configured: ${Boolean(process.env.TWITTER_USERNAME)}`);

    try {
        // Set up the database connection
        await connectToDatabase();
        console.log("Database connection established");

        // Start the MCP server
        server = await setupMcpServer();

        // Set up graceful shutdown handlers
        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);

        console.log('MCP server started successfully');
    } catch (error) {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}

async function handleShutdown() {
    console.log('Shutting down MCP server...');

    if (server) {
        try {
            await server.close();
            console.log('MCP server closed successfully');
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

