import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setupMcpServer } from "./server.js";
import { connectToDatabase } from "../config/db.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Try to load environment variables from multiple possible locations
function loadEnvironment() {
    // Possible env file locations
    const envFiles = [
        path.resolve(process.cwd(), '.env.mcp'),
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../.env.mcp'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../../../.env.mcp'),
        path.resolve(__dirname, '../../../.env')
    ];

    let loaded = false;
    for (const envPath of envFiles) {
        if (fs.existsSync(envPath)) {
            console.log(`Loading environment from ${envPath}`);
            dotenv.config({ path: envPath });
            loaded = true;
            break;
        }
    }

    if (!loaded) {
        console.warn('No .env or .env.mcp file found. Using default or system environment variables.');
        dotenv.config();
    }
}

// Load environment variables
loadEnvironment();

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

// Display loaded environment variables (excluding sensitive data)
function logEnvironment() {
    console.log('Environment configuration:');
    console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`- MONGODB_URI set: ${Boolean(process.env.MONGODB_URI)}`);
    console.log(`- Twitter credentials configured: ${Boolean(process.env.TWITTER_USERNAME)}`);
}

async function main() {
    try {
        // Log environment status
        logEnvironment();

        // Set up the MCP server
        server = await setupMcpServer();

        // Set up the database connection
        await connectToDatabase();
        server.server.sendLoggingMessage({
            level: "info",
            data: "Database connection established",
        });

        server.server.sendLoggingMessage({
            level: "info",
            data: "Twitter credentials configured: " + Boolean(process.env.TWITTER_USERNAME)
        });

        // Set up graceful shutdown handlers
        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);

    } catch (error) {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}

async function handleShutdown() {
    server.server.sendLoggingMessage({
        level: "info",
        data: "Shutting down MCP server..."
    });

    if (server) {
        try {
            await server.close();
            server.server.sendLoggingMessage({
                level: "info",
                data: "MCP server closed successfully"
            });
        } catch (err) {
            server.server.sendLoggingMessage({
                level: "error",
                data: "Error while closing MCP server:", err
            });
        }
    }

    process.exit(0);
}

// Run the main function
main().catch(err => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
});

